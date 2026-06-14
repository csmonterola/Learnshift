<?php

namespace App\Services\Rag;

use App\Exceptions\TextExtractionException;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;

class TextExtractor
{
    public function extract(string $filePath, string $fileType): string
    {
        try {
            return match (strtolower($fileType)) {
                'pdf'  => $this->extractPdf($filePath),
                'docx' => $this->extractDocx($filePath),
                'pptx' => $this->extractPptx($filePath),
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

    private function extractPdf(string $filePath): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($filePath);
        return $pdf->getText();
    }

    private function extractDocx(string $filePath): string
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
        return $text;
    }

    private function extractPptx(string $filePath): string
    {
        $presentation = PresentationIOFactory::load($filePath);
        $text = '';
        foreach ($presentation->getAllSlides() as $slide) {
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
        }
        return $text;
    }
}
