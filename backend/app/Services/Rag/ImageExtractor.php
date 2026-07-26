<?php

namespace App\Services\Rag;

use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Config;
use Smalot\PdfParser\Parser as PdfParser;
use ZipArchive;

class ImageExtractor
{
    private const PDF_DPI = 150;

    public function extract(string $filePath, string $fileType): array
    {
        return match (strtoupper($fileType)) {
            'DOCX'  => $this->extractFromZip($filePath, 'word/media/'),
            'PPTX'  => $this->extractFromZip($filePath, 'ppt/media/'),
            'PDF'   => $this->extractFromPdf($filePath),
            default => [],
        };
    }

    private function extractFromZip(string $filePath, string $prefix): array
    {
        $zip = new ZipArchive;
        if ($zip->open($filePath) !== true) {
            Log::warning('ImageExtractor: cannot open ZIP archive', ['path' => $filePath]);
            return [];
        }

        $images = [];

        for ($i = 0; $i < $zip->count(); $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'];

            if (str_starts_with($name, $prefix) && !str_ends_with($name, '/')) {
                $binary = $zip->getFromIndex($i);
                if ($binary === false || strlen($binary) === 0) {
                    continue;
                }

                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg'], true)) {
                    continue;
                }

                $images[] = [
                    'binary'      => $binary,
                    'page_number' => null,
                    'extension'   => $ext === 'jpeg' ? 'jpg' : $ext,
                ];
            }
        }

        $zip->close();
        return $images;
    }

    private function extractFromPdf(string $filePath): array
    {
        try {
            $config = new Config;
            $config->setRetainImageContent(true);
            $parser = new PdfParser([], $config);
            $document = $parser->parseFile($filePath);
        } catch (\Throwable $e) {
            Log::warning('ImageExtractor: PDF parse failed', ['path' => $filePath, 'error' => $e->getMessage()]);
            return [];
        }

        $images = [];
        $seen = [];

        foreach ($document->getPages() as $pageIndex => $page) {
            try {
                $xobjects = $page->getXObjects();
            } catch (\Throwable $e) {
                Log::warning('ImageExtractor: failed to get XObjects for page', [
                    'page' => $pageIndex + 1, 'error' => $e->getMessage(),
                ]);
                continue;
            }

            foreach ($xobjects as $xobject) {
                try {
                    if (!$xobject instanceof \Smalot\PdfParser\PDFObject) {
                        continue;
                    }

                    $header = $xobject->getHeader();
                    if (!$header || !$header->has('Subtype') || $header->get('Subtype')->getContent() !== 'Image') {
                        continue;
                    }

                    $oid = spl_object_id($xobject);
                    if (isset($seen[$oid])) {
                        continue;
                    }
                    $seen[$oid] = true;

                    $content = $xobject->getContent();
                    if ($content === null || strlen($content) === 0) {
                        continue;
                    }

                    $detected = $this->decodePdfImage($content, $header);

                    if ($detected !== null) {
                        $images[] = [
                            'binary'      => $detected['binary'],
                            'page_number' => $pageIndex + 1,
                            'extension'   => $detected['extension'],
                        ];
                    }
                } catch (\Throwable $e) {
                    Log::warning('ImageExtractor: failed to process PDF image', [
                        'page' => $pageIndex + 1, 'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return $images;
    }

    private function decodePdfImage(string $content, $header): ?array
    {
        $filter = null;
        if ($header->has('Filter')) {
            $filter = $header->get('Filter')->getContent();
        }

        if ($filter === 'DCTDecode') {
            return ['binary' => $content, 'extension' => 'jpg'];
        }

        if ($filter === 'JPXDecode') {
            return ['binary' => $content, 'extension' => 'jp2'];
        }

        if ($filter === 'FlateDecode') {
            return $this->decodeFlate($content, $header);
        }

        Log::warning('ImageExtractor: unsupported PDF image filter', ['filter' => $filter]);

        return null;
    }

    private function decodeFlate(string $content, $header): ?array
    {
        // 1) Try detectImageFormat directly — covers the case where getContent()
        //    already returned a known image format (PNG-wrapped, etc.).
        $detected = $this->detectImageFormat($content);
        if ($detected !== null) {
            return ['binary' => $content, 'extension' => $detected];
        }

        // 2) Try gzuncompress — covers PDFs where the library returned the
        //    raw compressed stream (backward compat).
        $decoded = @gzuncompress($content);
        if ($decoded !== false) {
            $detected = $this->detectImageFormat($decoded);
            if ($detected !== null) {
                return ['binary' => $decoded, 'extension' => $detected];
            }

            return ['binary' => $decoded, 'extension' => 'bin'];
        }

        // 3) Content is already-decoded raw pixel data — reconstruct from header.
        return $this->reconstructFlateImage($content, $header);
    }

    private function reconstructFlateImage(string $data, $header): ?array
    {
        try {
            $width  = (int) $this->getHeaderValue($header, 'Width');
            $height = (int) $this->getHeaderValue($header, 'Height');

            if ($width <= 0 || $height <= 0 || $width > 5000 || $height > 5000) {
                return null;
            }

            $bpc        = max(1, (int) ($this->getHeaderValue($header, 'BitsPerComponent') ?? 8));
            $colorSpace = $this->resolveColorSpace($header);

            if ($colorSpace === null) {
                return null;
            }

            ['samples' => $samples, 'type' => $type, 'palette' => $palette] = $colorSpace;
            $expectedBytes = (int) ceil($width * $height * $samples * $bpc / 8);

            if (strlen($data) < $expectedBytes) {
                Log::warning('ImageExtractor: FlateDecode data too short for declared dimensions', [
                    'width' => $width, 'height' => $height, 'expected' => $expectedBytes, 'actual' => strlen($data),
                ]);
                return null;
            }

            // Un-palettize Indexed color spaces before feeding to the pipeline
            if ($type === 'Indexed' && $palette !== null) {
                $data = $this->unpackIndexed($data, $width, $height, $bpc, $palette);
                $samples = 3;
                $type = 'DeviceRGB';
                $bpc = 8;
            }

            // Convert CMYK to RGB inline if needed
            if ($type === 'DeviceCMYK') {
                $data = $this->cmykToRgb($data, $width, $height);
                $samples = 3;
                $type = 'DeviceRGB';
                $bpc = 8;
            }

            // Build a BMP in-memory from raw pixels, load via GD, re-encode as PNG
            if ($type === 'DeviceGray' && $bpc === 8) {
                $png = $this->rawGrayToPng($data, $width, $height);
            } elseif ($type === 'DeviceRGB' && $bpc === 8) {
                $png = $this->rawRgbToPng($data, $width, $height);
            } else {
                // Fallback for unusual BPC values (1, 2, 4, 16) — pixel-by-pixel
                Log::info('ImageExtractor: using slow pixel path for FlateDecode image', [
                    'type' => $type, 'bpc' => $bpc, 'width' => $width, 'height' => $height,
                ]);
                $png = $this->rawPixelsToPng($data, $width, $height, $samples, $bpc, $type);
            }

            if ($png === null) {
                return null;
            }

            return ['binary' => $png, 'extension' => 'png'];
        } catch (\Throwable $e) {
            Log::warning('ImageExtractor: failed to reconstruct FlateDecode image', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function rawRgbToPng(string $data, int $width, int $height): ?string
    {
        $rowBytes  = $width * 3;
        $rowStride = (int) ceil($rowBytes / 4) * 4;
        $pixelDataSize = $rowStride * $height;
        $offset   = 14 + 40;

        $bmp  = pack('v2Vv2V', 0x4D42, $offset + $pixelDataSize, 0, 0, $offset);
        $bmp .= pack('V3v2V6', 40, $width, $height, 1, 24, 0, $pixelDataSize, 2835, 2835, 0, 0);

        for ($y = $height - 1; $y >= 0; $y--) {
            $row = substr($data, $y * $rowBytes, $rowBytes);
            $bgr = '';
            for ($i = 0; $i < $rowBytes; $i += 3) {
                $bgr .= $row[$i + 2] . $row[$i + 1] . $row[$i];
            }
            $bmp .= str_pad($bgr, $rowStride, "\0");
        }

        return $this->bmpToPng($bmp);
    }

    private function rawGrayToPng(string $data, int $width, int $height): ?string
    {
        $rowBytes  = $width;
        $rowStride = (int) ceil($rowBytes / 4) * 4;
        $paletteSize = 256 * 4;
        $pixelDataSize = $rowStride * $height;
        $offset   = 14 + 40 + $paletteSize;

        $bmp  = pack('v2Vv2V', 0x4D42, $offset + $pixelDataSize, 0, 0, $offset);
        $bmp .= pack('V3v2V6', 40, $width, $height, 1, 8, 0, $pixelDataSize, 2835, 2835, 0, 0);

        for ($i = 0; $i < 256; $i++) {
            $bmp .= pack('C4', $i, $i, $i, 0);
        }

        for ($y = $height - 1; $y >= 0; $y--) {
            $row = substr($data, $y * $rowBytes, $rowBytes);
            $bmp .= str_pad($row, $rowStride, "\0");
        }

        return $this->bmpToPng($bmp);
    }

    private function bmpToPng(string $bmp): ?string
    {
        $img = @imagecreatefromstring($bmp);
        if ($img === false) {
            return null;
        }

        ob_start();
        $ok = imagepng($img, null, 9);
        $png = ob_get_clean();
        imagedestroy($img);

        return ($ok && $png !== false && $png !== '') ? $png : null;
    }

    private function rawPixelsToPng(string $data, int $width, int $height, int $samples, int $bpc, string $type): ?string
    {
        $img = imagecreatetruecolor($width, $height);
        if (!$img) {
            return null;
        }

        $byteIndex = 0;
        $bitBuf = 0;
        $bitCount = 0;

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                if ($bpc < 8) {
                    if ($bitCount === 0) {
                        $bitBuf = ord($data[$byteIndex++]);
                        $bitCount = 8;
                    }
                    $bitCount -= $bpc;
                    $val = ($bitBuf >> $bitCount) & ((1 << $bpc) - 1);
                    $gray = (int) round($val * 255 / ((1 << $bpc) - 1));
                    $color = imagecolorallocate($img, $gray, $gray, $gray);
                    imagesetpixel($img, $x, $y, $color);
                } elseif ($samples === 1) {
                    $gray = ord($data[$byteIndex++]);
                    $color = imagecolorallocate($img, $gray, $gray, $gray);
                    imagesetpixel($img, $x, $y, $color);
                } elseif ($samples === 3) {
                    $r = ord($data[$byteIndex++]);
                    $g = ord($data[$byteIndex++]);
                    $b = ord($data[$byteIndex++]);
                    $color = imagecolorallocate($img, $r, $g, $b);
                    imagesetpixel($img, $x, $y, $color);
                } elseif ($samples === 4) {
                    $c = ord($data[$byteIndex++]) / 255;
                    $m = ord($data[$byteIndex++]) / 255;
                    $y2 = ord($data[$byteIndex++]) / 255;
                    $k = ord($data[$byteIndex++]) / 255;
                    $r = (int) round((1 - $c) * (1 - $k) * 255);
                    $g = (int) round((1 - $m) * (1 - $k) * 255);
                    $b = (int) round((1 - $y2) * (1 - $k) * 255);
                    $color = imagecolorallocate($img, max(0, min(255, $r)), max(0, min(255, $g)), max(0, min(255, $b)));
                    imagesetpixel($img, $x, $y, $color);
                }
            }
        }

        ob_start();
        $ok = imagepng($img, null, 9);
        $png = ob_get_clean();
        imagedestroy($img);

        return ($ok && $png !== false && $png !== '') ? $png : null;
    }

    private function cmykToRgb(string $data, int $width, int $height): string
    {
        $rgb = '';
        $len = strlen($data);

        for ($i = 0; $i + 3 < $len; $i += 4) {
            $c = ord($data[$i]) / 255;
            $m = ord($data[$i + 1]) / 255;
            $y = ord($data[$i + 2]) / 255;
            $k = ord($data[$i + 3]) / 255;
            $r = (int) round((1 - $c) * (1 - $k) * 255);
            $g = (int) round((1 - $m) * (1 - $k) * 255);
            $b = (int) round((1 - $y) * (1 - $k) * 255);
            $rgb .= chr(max(0, min(255, $r))) . chr(max(0, min(255, $g))) . chr(max(0, min(255, $b)));
        }

        return $rgb;
    }

    private function unpackIndexed(string $data, int $width, int $height, int $bpc, array $palette): string
    {
        $rgb = '';
        $byteIndex = 0;
        $bitBuf = 0;
        $bitCount = 0;

        for ($i = 0; $i < $width * $height; $i++) {
            if ($bpc < 8) {
                if ($bitCount === 0) {
                    $bitBuf = ord($data[$byteIndex++]);
                    $bitCount = 8;
                }
                $bitCount -= $bpc;
                $idx = ($bitBuf >> $bitCount) & ((1 << $bpc) - 1);
            } else {
                $idx = ord($data[$byteIndex++]);
            }

            $rgb .= $palette[$idx] ?? "\0\0\0";
        }

        return $rgb;
    }

    private function getHeaderValue($header, string $key): mixed
    {
        if (!$header || !$header->has($key)) {
            return null;
        }

        $element = $header->get($key);

        if ($element === null) {
            return null;
        }

        if (method_exists($element, 'getContent')) {
            return $element->getContent();
        }

        if (method_exists($element, 'getValue')) {
            return $element->getValue();
        }

        return (string) $element;
    }

    private function resolveColorSpace($header): ?array
    {
        if (!$header || !$header->has('ColorSpace')) {
            return ['samples' => 3, 'type' => 'DeviceRGB', 'palette' => null];
        }

        $cs = $header->get('ColorSpace');

        // Direct name (e.g. "DeviceRGB")
        if (method_exists($cs, 'getContent')) {
            $name = $cs->getContent();
            if (is_string($name)) {
                return $this->colorSpaceByName($name);
            }
        }

        // Array form e.g. [/Indexed /DeviceRGB 255 <data>] or [/ICCBased 12 0 R]
        if ($cs instanceof \Smalot\PdfParser\PDFObject) {
            $array = $cs->getHeader()?->getElements();
            if (is_array($array) && count($array) > 0) {
                $firstName = $array[0];
                $name = method_exists($firstName, 'getContent') ? $firstName->getContent() : null;

                if ($name === 'Indexed' && count($array) >= 4) {
                    $base = method_exists($array[1], 'getContent') ? $array[1]->getContent() : null;
                    $baseInfo = $this->colorSpaceByName($base ?? 'DeviceRGB');
                    $paletteData = method_exists($array[3], 'getContent') ? $array[3]->getContent() : null;

                    if (is_string($paletteData)) {
                        $palette = [];
                        $baseSamples = $baseInfo['samples'];
                        $numEntries = (int) ($this->getHeaderValue($cs, 'Indexed') ?? 255) + 1;
                        for ($i = 0; $i < $numEntries; $i++) {
                            $entry = substr($paletteData, $i * $baseSamples, $baseSamples);
                            if ($baseSamples === 3) {
                                $palette[] = $entry;
                            } elseif ($baseSamples === 1) {
                                $palette[] = $entry . $entry . $entry;
                            } elseif ($baseSamples === 4) {
                                // CMYK palette entry — approximate to RGB
                                $c = ord($entry[0]) / 255;
                                $m = ord($entry[1]) / 255;
                                $y = ord($entry[2]) / 255;
                                $k = ord($entry[3]) / 255;
                                $r = chr(max(0, min(255, (int) round((1 - $c) * (1 - $k) * 255))));
                                $g = chr(max(0, min(255, (int) round((1 - $m) * (1 - $k) * 255))));
                                $b = chr(max(0, min(255, (int) round((1 - $y) * (1 - $k) * 255))));
                                $palette[] = $r . $g . $b;
                            } else {
                                // fallback: grayscale
                                $palette[] = "\0\0\0";
                            }
                        }

                        return ['samples' => 1, 'type' => 'Indexed', 'palette' => $palette];
                    }
                }

                if ($name === 'ICCBased' && count($array) >= 2) {
                    // Try to get alternate color space from the ICC profile object
                    $iccObj = $array[1] ?? null;
                    if ($iccObj instanceof \Smalot\PdfParser\PDFObject) {
                        $alt = $this->getHeaderValue($iccObj->getHeader(), 'Alternate');
                        if (is_string($alt)) {
                            return $this->colorSpaceByName($alt);
                        }
                    }
                    return ['samples' => 3, 'type' => 'DeviceRGB', 'palette' => null];
                }
            }
        }

        // Fallback
        return ['samples' => 3, 'type' => 'DeviceRGB', 'palette' => null];
    }

    private function colorSpaceByName(string $name): array
    {
        return match ($name) {
            'DeviceGray' => ['samples' => 1, 'type' => 'DeviceGray', 'palette' => null],
            'DeviceRGB'  => ['samples' => 3, 'type' => 'DeviceRGB', 'palette' => null],
            'DeviceCMYK' => ['samples' => 4, 'type' => 'DeviceCMYK', 'palette' => null],
            default      => ['samples' => 3, 'type' => 'DeviceRGB', 'palette' => null],
        };
    }

    private function detectImageFormat(string $binary): ?string
    {
        if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) {
            return 'png';
        }
        if (str_starts_with($binary, "\xff\xd8")) {
            return 'jpg';
        }
        if (str_starts_with($binary, "GIF87a") || str_starts_with($binary, "GIF89a")) {
            return 'gif';
        }
        if (str_starts_with($binary, "BM")) {
            return 'bmp';
        }
        if (str_starts_with($binary, "\x00\x00\x00\x0c\x6a\x50\x20\x20") || str_starts_with($binary, "\x00\x00\x00\x0c\x6a\x50\x20\x20\x0d\x0a\x87\x0a")) {
            return 'jp2';
        }
        if (str_starts_with($binary, "RIFF") && substr($binary, 8, 4) === "WEBP") {
            return 'webp';
        }

        return null;
    }
}
