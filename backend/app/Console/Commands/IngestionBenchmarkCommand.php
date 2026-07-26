<?php

namespace App\Console\Commands;

use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\User;
use App\Services\Rag\MaterialIngestionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;

class IngestionBenchmarkCommand extends Command
{
    protected $signature = 'benchmark:ingestion
                            {--no-pool : Disable Http::pool() by using a single batch}
                            {--large : Use large fixtures (50+ chunks)}';
    protected $description = 'Generate fixture files and benchmark ingestion per file type';

    public function handle(MaterialIngestionService $service): int
    {
        if ($this->option('no-pool')) {
            config(['services.mistral.embedding_batch_size' => 99999]);
            $this->warn('Http::pool() disabled (single batch).');
        }

        $this->info('Creating fixture files...');

        Storage::disk('public')->makeDirectory('benchmark');

        $large = $this->option('large');
        [$pdfPath, $docxPath, $pptxPath] = $this->createFixtures($large);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $materials = [
            'PDF'  => $this->createMaterial($teacher, $lesson, 'Benchmark PDF',  'PDF',  $pdfPath),
            'DOCX' => $this->createMaterial($teacher, $lesson, 'Benchmark DOCX', 'DOCX', $docxPath),
            'PPTX' => $this->createMaterial($teacher, $lesson, 'Benchmark PPTX', 'PPTX', $pptxPath),
        ];

        $results = [];

        foreach ($materials as $type => $material) {
            $this->info("Ingesting {$type}...");
            $t0 = hrtime(true);
            $service->ingest($material);
            $totalMs = (hrtime(true) - $t0) / 1_000_000;
            $results[$type] = round($totalMs, 1);
            $this->info("  {$type}: {$results[$type]} ms");
        }

        $this->newLine();
        $this->table(['File Type', 'Total Time (ms)'], array_map(
            fn($t, $v) => [$t, $v],
            array_keys($results),
            array_values($results)
        ));
        $this->info('Check storage/logs/laravel.log for per-stage timings.');

        return Command::SUCCESS;
    }

    private function createFixtures(bool $large = false): array
    {
        $pdfPath  = $this->createPdfFixture($large);
        $docxPath = $this->createDocxFixture($large);
        $pptxPath = $this->createPptxFixture($large);
        return [$pdfPath, $docxPath, $pptxPath];
    }

    // ─── PDF via FPDI / raw ───────────────────────────────────────

    private function createPdfFixture(bool $large = false): string
    {
        $path = 'benchmark/fixture.pdf';
        $pageCount = $large ? 50 : 2;
        $pages = [];
        for ($i = 1; $i <= $pageCount; $i++) {
            $pages[] = "Page {$i} Content\n\n"
                . "This is page {$i} of the benchmark PDF document.\n"
                . "It contains sample text for testing ingestion.\n"
                . str_repeat('Lorem ipsum dolor sit amet consectetur adipiscing elit. ', 10);
        }
        $pdf = $this->generatePdf($pages);
        Storage::disk('public')->put($path, $pdf);
        return $path;
    }

    private function generatePdf(array $pages): string
    {
        $font = 'Helvetica';

        $objects = [];
        $objectId = 1;

        // Helper to add an object and return its ID
        $add = function (string $content) use (&$objects, &$objectId): int {
            $id = $objectId++;
            $objects[] = ['id' => $id, 'content' => $content];
            return $id;
        };

        // 1. Catalog
        $catalogId = $add('<< /Type /Catalog /Pages 2 0 R >>');

        // 2. Pages tree node
        $pageObjIds = [];
        $contentStreamIds = [];
        foreach ($pages as $i => $text) {
            $escaped = $this->pdfEscape($text);
            $stream = "BT /F1 12 Tf 50 750 Td ({$escaped}) Tj ET\n";
            $streamId = $add("<< /Length " . strlen($stream) . " >>\nstream\n{$stream}\nendstream");
            $contentStreamIds[] = $streamId;

            $pageId = $add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {$streamId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>");
            $pageObjIds[] = $pageId;
        }

        $kids = '[' . implode(' ', array_map(fn($id) => "{$id} 0 R", $pageObjIds)) . ']';
        $pagesId = $add("<< /Type /Pages /Kids {$kids} /Count " . count($pages) . " >>");

        // 3. Font
        $fontId = $add("<< /Type /Font /Subtype /Type1 /BaseFont /{$font} >>");

        // Reorder: pages tree must come before pages, catalog must come first
        // Actually PDF objects can be in any order as long as xref points correctly
        // Let's just output them in ID order

        $body = '';
        $offsets = [];

        // Sort objects by their assigned ID
        usort($objects, fn($a, $b) => $a['id'] <=> $b['id']);

        foreach ($objects as $obj) {
            $offsets[$obj['id']] = strlen($body);
            $body .= "{$obj['id']} 0 obj\n{$obj['content']}\nendobj\n";
        }

        $header = "%PDF-1.4\n";
        $content = $header . $body;

        // xref table
        $maxId = $objectId - 1;
        $headerLen = strlen($header);
        $xref = "xref\n";
        $xref .= "0 " . ($maxId + 1) . "\n";
        $xref .= sprintf("%010d 65535 f \n", 0);
        for ($i = 1; $i <= $maxId; $i++) {
            if (isset($offsets[$i])) {
                $xref .= sprintf("%010d 00000 n \n", $headerLen + $offsets[$i]);
            } else {
                $xref .= sprintf("%010d 00000 f \n", 0);
            }
        }

        $xrefOffset = strlen($content);
        $content .= $xref;
        $content .= "trailer\n<< /Size " . ($maxId + 1) . " /Root {$catalogId} 0 R >>\n";
        $content .= "startxref\n{$xrefOffset}\n%%EOF";

        return $content;
    }

    private function pdfEscape(string $text): string
    {
        $text = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
        // Keep only printable ASCII + newline
        $text = preg_replace('/[^\\x20-\\x7E\\r\\n]/', '', $text);
        return $text;
    }

    // ─── DOCX via PhpWord ─────────────────────────────────────────

    private function createDocxFixture(bool $large = false): string
    {
        $path = 'benchmark/fixture.docx';

        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $section = $phpWord->addSection();

        $repeatCount = $large ? 1000 : 200;
        $section->addText('Benchmark DOCX Document');
        $section->addTextBreak();
        $section->addText('This is a test document for benchmarking ingestion. '
            . str_repeat('It contains enough text to generate multiple chunks. ', $repeatCount));

        $filePath = tempnam(sys_get_temp_dir(), 'docx_') . '.docx';
        WordIOFactory::createWriter($phpWord, 'Word2007')->save($filePath);
        $contents = file_get_contents($filePath);
        unlink($filePath);

        Storage::disk('public')->put($path, $contents);
        return $path;
    }

    // ─── PPTX via PhpPresentation ──────────────────────────────────

    private function createPptxFixture(bool $large = false): string
    {
        $path = 'benchmark/fixture.pptx';
        $presentation = new \PhpOffice\PhpPresentation\PhpPresentation();

        $slideCount = $large ? 30 : 3;
        for ($i = 1; $i <= $slideCount; $i++) {
            $slide = $i === 1 ? $presentation->getActiveSlide() : $presentation->createSlide();
            $richText = $slide->createRichTextShape();
            $richText->setHeight(600)->setWidth(600)->setOffsetX(50)->setOffsetY(50);
            $textRun = $richText->createTextRun("Slide {$i}: Benchmark Content");
            $textRun->getFont()->setSize(14);
            $richText->createBreak();
            $textRun = $richText->createTextRun(
                str_repeat('This is detailed slide content for benchmarking purposes. ', 30)
            );
            $textRun->getFont()->setSize(12);
        }

        $filePath = tempnam(sys_get_temp_dir(), 'pptx_') . '.pptx';
        PresentationIOFactory::createWriter($presentation, 'PowerPoint2007')->save($filePath);
        $contents = file_get_contents($filePath);
        unlink($filePath);

        Storage::disk('public')->put($path, $contents);
        return $path;
    }

    private function createMaterial(User $teacher, Lesson $lesson, string $title, string $fileType, string $filePath): LearningMaterial
    {
        $size = Storage::disk('public')->size($filePath);

        return LearningMaterial::create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'title'            => $title,
            'file_path'        => $filePath,
            'file_name'        => basename($filePath),
            'file_type'        => $fileType,
            'file_size'        => $size,
            'ai_sync'          => true,
            'ingestion_status' => 'pending',
        ]);
    }
}
