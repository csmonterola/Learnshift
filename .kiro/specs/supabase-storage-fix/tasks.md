# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - JWT Token Authentication Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: file uploads using JWT tokens as S3 credentials
  - Test that storage operations fail when JWT tokens (containing dots) are used as AWS S3 credentials
  - Test that file uploads in ContentController and TopicController fail with authentication errors (403/401)
  - Test that IngestLearningMaterialJob fails to access files due to authentication issues
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Storage::disk('public')->store() returns false when JWT tokens used as credentials")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - File Operations Behavior Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for file operations that don't depend on storage authentication
  - Observe: File validation logic (file type, size restrictions) works correctly
  - Observe: File path generation follows lessons/{lesson_id}/materials/ pattern
  - Observe: Database record creation for LearningMaterial models works correctly
  - Observe: Lesson ownership verification continues to function
  - Write property-based tests capturing these observed behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix Supabase Storage Authentication

  - [x] 3.1 Update storage configuration to use S3 service keys
    - Replace JWT token usage with proper S3-compatible service keys in filesystem configuration
    - Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables to use S3 service keys (not JWT tokens)
    - Ensure S3 service keys do not contain dot separators (which indicate JWT tokens)
    - Configure proper Supabase storage endpoint URL following pattern: https://{project}.supabase.co/storage/v1/s3
    - Validate bucket name matches Supabase project configuration
    - _Bug_Condition: JWT tokens (containing dots) used as S3 credentials causing authentication failures_
    - _Expected_Behavior: Storage operations authenticate successfully with proper S3 service keys_
    - _Preservation: File upload path structure, validation logic, and database operations remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Add configuration validation to detect JWT tokens
    - Implement validation logic to reject JWT tokens (strings containing dots) as storage credentials
    - Add validation for S3 service key format and length requirements
    - Validate Supabase storage endpoint URL format
    - Provide specific error messages for invalid credential types
    - _Bug_Condition: System accepts JWT tokens as valid storage credentials_
    - _Expected_Behavior: System rejects JWT tokens and requires proper S3 service keys_
    - _Preservation: Other configuration validation logic remains unchanged_
    - _Requirements: 1.6, 2.6_

  - [x] 3.3 Enhance ContentController file upload error handling
    - Add comprehensive error handling for storage authentication failures
    - Implement detailed logging for upload failures without exposing credentials
    - Add verification that uploaded files exist and URLs are accessible
    - Provide user-friendly error messages for authentication and upload failures
    - _Bug_Condition: File uploads fail with JWT token authentication_
    - _Expected_Behavior: File uploads succeed with proper S3 authentication and provide clear error messages on failure_
    - _Preservation: File validation, path generation, and database record creation remain unchanged_
    - _Requirements: 1.2, 2.2, 3.1, 3.2, 3.6_

   - [x] 3.4 Enhance TopicController file upload error handling
     - Add comprehensive error handling for storage authentication failures  
     - Implement detailed logging for upload failures without exposing credentials
     - Add verification that uploaded files exist and URLs are accessible
     - Provide user-friendly error messages for authentication and upload failures
     - _Bug_Condition: File uploads fail with JWT token authentication_
     - _Expected_Behavior: File uploads succeed with proper S3 authentication and provide clear error messages on failure_
     - _Preservation: File validation, path generation, and database record creation remain unchanged_
     - _Requirements: 1.3, 2.3, 3.1, 3.2, 3.6_

   - [x] 3.5 Fix IngestLearningMaterialJob storage access
    - Update job to handle storage authentication properly with S3 service keys
    - Add error handling for file access failures due to authentication issues
    - Implement retry logic for transient storage authentication failures
    - Log detailed error information for debugging storage access issues
     - _Bug_Condition: File processing jobs fail due to storage authentication errors_
     - _Expected_Behavior: File processing jobs access storage successfully with proper authentication_
     - _Preservation: File processing logic and database updates remain unchanged_
     - _Requirements: 1.4, 2.4, 3.6_

   - [x] 3.6 Fix file URL generation across the application
    - Ensure URL generation uses proper authentication context
    - Verify generated URLs are immediately accessible without authentication delays
    - Add URL accessibility testing and logging for debugging
    - Implement consistent URL format across all controllers
    - _Bug_Condition: Generated file URLs are inaccessible due to authentication issues_
    - _Expected_Behavior: Generated URLs are publicly accessible and consistently formatted_
    - _Preservation: URL generation pattern and file access permissions remain unchanged_
    - _Requirements: 1.5, 2.5, 3.3_

  - [ ] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - S3 Service Key Authentication Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - File Operations Behavior Preservation
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.