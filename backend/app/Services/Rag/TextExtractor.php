<?php

namespace App\Services\Rag;

use App\Exceptions\TextExtractionException;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;

class TextExtractor
{
    /**
     * Extract all text as a single flattened string.
     * Kept for backward compatibility; internally delegates to extractWithPages().
     */
    public function extract(string $filePath, string $fileType): string
    {
        $pages = $this->extractWithPages($filePath, $fileType);

        return implode("\n", array_map(fn($p) => $p['text'], $pages));
    }

    /**
     * Extract text per page/slide.
     *
     * @return array{page_number: int, text: string}[]
     */
    public function extractWithPages(string $filePath, string $fileType): array
    {
        try {
            return match (strtolower($fileType)) {
                'pdf'  => $this->extractPdfWithPages($filePath),
                'pptx' => $this->extractPptxWithPages($filePath),
                'docx' => $this->extractDocxAsSinglePage($filePath),
                default => throw new TextExtractionException(
                    "Unsupported file type: {$fileType}"
                ),
            };
        } catch (TextExtractionException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new TextExtractionException(
                "Failed to extract text from {$filePath}: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * @return array{page_number: int, text: string}[]
     */
    private function extractPdfWithPages(string $filePath): array
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($filePath);

        $result = [];
        foreach ($pdf->getPages() as $i => $page) {
            $text = trim($page->getText());
            if ($text !== '') {
                $result[] = [
                    'page_number' => $i + 1,
                    'text'        => $text,
                ];
            }
        }

        return $result;
    }

    /**
     * @return array{page_number: int, text: string}[]
     */
    private function extractPptxWithPages(string $filePath): array
    {
        $presentation = PresentationIOFactory::load($filePath);

        $result = [];
        foreach ($presentation->getAllSlides() as $i => $slide) {
            $text = '';
            foreach ($slide->getShapeCollection() as $shape) {
                if ($shape instanceof \PhpOffice\PhpPresentation\Shape\RichText) {
                    foreach ($shape->getParagraphs() as $paragraph) {
                        foreach ($paragraph->getRichTextElements() as $element) {
                            $text .= $element->getText() . ' ';
                        }
                        $text .= "\n";
                    }
                }
            }
            $text = trim($text);
            if ($text !== '') {
                $result[] = [
                    'page_number' => $i + 1,
                    'text'        => $text,
                ];
            }
        }

        return $result;
    }

    /**
     * DOCX has no native page concept — return as a single entry with page_number = null.
     *
     * @return array{page_number: null, text: string}[]
     */
    private function extractDocxAsSinglePage(string $filePath): array
    {
        $phpWord = WordIOFactory::load($filePath);
        $text = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if (method_exists($element, 'getText')) {
                    $text .= $element->getText() . "\n";
                } elseif (method_exists($element, 'getElements')) {
                    foreach ($element->getElements() as $child) {
                        if (method_exists($child, 'getText')) {
                            $text .= $child->getText() . "\n";
                        }
                    }
                }
            }
        }

        $text = trim($text);

        return $text !== '' ? [['page_number' => null, 'text' => $text]] : [];
    }
}
