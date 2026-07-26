<?php

namespace Tests\Unit;

use App\Services\Rag\ImageExtractor;
use Tests\TestCase;

class ImageExtractorTest extends TestCase
{
    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixturesDir = __DIR__ . '/../Fixtures';
    }

    /** @test */
    public function extracts_jpeg_from_docx()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract("{$this->fixturesDir}/test_image.docx", 'DOCX');

        $this->assertCount(1, $result);
        $this->assertNull($result[0]['page_number']);
        $this->assertSame('jpg', $result[0]['extension']);
        $this->assertGreaterThan(100, strlen($result[0]['binary']));
        $this->assertStringStartsWith("\xff\xd8", $result[0]['binary']);
    }

    /** @test */
    public function extracts_jpeg_from_pptx()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract("{$this->fixturesDir}/test_image.pptx", 'PPTX');

        $this->assertCount(1, $result);
        $this->assertNull($result[0]['page_number']);
        $this->assertSame('jpg', $result[0]['extension']);
        $this->assertGreaterThan(100, strlen($result[0]['binary']));
        $this->assertStringStartsWith("\xff\xd8", $result[0]['binary']);
    }

    /** @test */
    public function extracts_jpeg_from_pdf_with_page_numbers()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract("{$this->fixturesDir}/test_2page.pdf", 'PDF');

        $this->assertCount(2, $result);

        $expectedPages = [1, 2];
        $actualPages = array_column($result, 'page_number');
        sort($actualPages);
        $this->assertSame([1, 2], $actualPages);

        foreach ($result as $img) {
            $this->assertSame('jpg', $img['extension']);
            $this->assertStringStartsWith("\xff\xd8", $img['binary']);
        }
    }

    /** @test */
    public function returns_empty_array_for_unsupported_file_type()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract("{$this->fixturesDir}/test_image.jpg", 'TXT');
        $this->assertSame([], $result);
    }

    /** @test */
    public function returns_empty_array_for_nonexistent_file()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract('/nonexistent/file.docx', 'DOCX');
        $this->assertSame([], $result);
    }

    /** @test */
    public function is_case_insensitive_for_file_type()
    {
        $extractor = new ImageExtractor;
        $result = $extractor->extract("{$this->fixturesDir}/test_image.docx", 'docx');
        $this->assertCount(1, $result);

        $result2 = $extractor->extract("{$this->fixturesDir}/test_2page.pdf", 'pdf');
        $this->assertCount(2, $result2);
    }
}
