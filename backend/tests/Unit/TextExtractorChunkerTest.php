<?php

namespace Tests\Unit;

use App\Services\Rag\TextChunker;
use App\Services\Rag\TextExtractor;
use Tests\TestCase;

class TextExtractorChunkerTest extends TestCase
{
    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixturesDir = __DIR__ . '/../Fixtures';
    }

    // ─── extractWithPages ─────────────────────────────────────────

    /** @test */
    public function extract_with_pages_returns_per_page_text_for_pdf()
    {
        $extractor = new TextExtractor;
        $result = $extractor->extractWithPages(
            "{$this->fixturesDir}/test_2page.pdf",
            'PDF'
        );

        $this->assertCount(2, $result);
        $this->assertSame(1, $result[0]['page_number']);
        $this->assertStringContainsString('Page 1 text', $result[0]['text']);
        $this->assertSame(2, $result[1]['page_number']);
        $this->assertStringContainsString('Page 2 text', $result[1]['text']);
    }

    /** @test */
    public function extract_with_pages_returns_docx_as_single_page_null()
    {
        $extractor = new TextExtractor;
        $result = $extractor->extractWithPages(
            "{$this->fixturesDir}/test_image.docx",
            'DOCX'
        );

        $this->assertCount(1, $result);
        $this->assertNull($result[0]['page_number']);
        $this->assertNotEmpty($result[0]['text']);
    }

    // ─── extract() still works (backward compat) ──────────────────

    /** @test */
    public function extract_still_returns_flattened_text()
    {
        $extractor = new TextExtractor;
        $text = $extractor->extract(
            "{$this->fixturesDir}/test_2page.pdf",
            'PDF'
        );

        $this->assertStringContainsString('Page 1 text', $text);
        $this->assertStringContainsString('Page 2 text', $text);
    }

    // ─── chunkWithPages ───────────────────────────────────────────

    /** @test */
    public function chunk_with_pages_tags_page_number_for_short_text()
    {
        $chunker = new TextChunker;

        // Each page has enough text to exceed 5-token (20-char) limit separately
        $result = $chunker->chunkWithPages([
            ['page_number' => 1, 'text' => 'Page one content. aaa bbb ccc ddd eee fff ggg hhh iii jjj'],
            ['page_number' => 2, 'text' => 'Page two content. aaa bbb ccc ddd eee fff ggg hhh iii jjj'],
        ], maxTokens: 20, overlap: 2);

        $pages = array_unique(array_column($result, 'page_number'));
        $this->assertContains(1, $pages);
        $this->assertContains(2, $pages);
    }

    /** @test */
    public function chunk_with_pages_respects_page_tag_when_overlap_spans_pages()
    {
        $chunker = new TextChunker;

        // Use tiny maxTokens (20 chars = 5 tokens) so chunks are small.
        // Page 1 has 10 words → split into two chunks.
        // The second chunk's overlap may contain words from page 1 but should
        // still be tagged with page 1 since it started there.
        $result = $chunker->chunkWithPages([
            ['page_number' => 1, 'text' => 'aaa bbb ccc ddd eee fff ggg hhh iii jjj'],
            ['page_number' => 2, 'text' => 'kkk lll mmm nnn ooo ppp qqq rrr sss ttt'],
        ], maxTokens: 5, overlap: 1);

        $this->assertNotEmpty($result);
        $this->assertSame(1, $result[0]['page_number']);
    }

    /** @test */
    public function chunk_with_pages_returns_empty_for_empty_input()
    {
        $chunker = new TextChunker;
        $this->assertSame([], $chunker->chunkWithPages([]));
    }

    /** @test */
    public function chunk_still_returns_flattened_text()
    {
        $chunker = new TextChunker;
        $result = $chunker->chunk('Hello world foo bar baz');

        $this->assertIsArray($result);
        $this->assertContainsOnly('string', $result);
        $this->assertStringContainsString('Hello world', $result[0]);
    }
}
