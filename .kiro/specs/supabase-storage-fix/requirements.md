# Requirements Document

## Introduction

This bugfix addresses critical authentication failures in the Laravel application's Supabase storage integration. The current implementation incorrectly uses JWT tokens (anon and service_role) as AWS S3 credentials when attempting to interact with Supabase storage, resulting in authentication errors that prevent file uploads, processing, and URL generation across the application. This affects the ContentController, TopicController, and IngestLearningMaterialJob components.

## Requirements

### Current Behavior (Defect)

1.1 WHEN JWT tokens (anon or service_role) are used as AWS S3 credentials for storage operations THEN the system receives authentication errors (403/401) from Supabase storage API

1.2 WHEN file uploads are attempted through ContentController with JWT token credentials THEN the storage operation fails and returns false or null paths

1.3 WHEN file uploads are attempted through TopicController with JWT token credentials THEN the storage operation fails with authentication exceptions

1.4 WHEN IngestLearningMaterialJob processes files with JWT token credentials THEN the file processing fails due to storage access errors

1.5 WHEN file URL generation is attempted with JWT token authentication THEN the generated URLs are inaccessible or return authentication errors

1.6 WHEN storage configuration validation occurs with JWT tokens THEN the validation incorrectly accepts invalid credentials

### Expected Behavior (Correct)

2.1 WHEN proper S3-compatible service keys are used for storage operations THEN the system SHALL successfully authenticate with Supabase storage API

2.2 WHEN file uploads are attempted through ContentController with valid S3 service keys THEN the system SHALL store files successfully and return valid storage paths

2.3 WHEN file uploads are attempted through TopicController with valid S3 service keys THEN the system SHALL store files successfully without authentication exceptions

2.4 WHEN IngestLearningMaterialJob processes files with valid S3 service keys THEN the system SHALL access and process files successfully

2.5 WHEN file URL generation is attempted with proper authentication THEN the system SHALL generate publicly accessible URLs

2.6 WHEN storage configuration validation occurs THEN the system SHALL reject JWT tokens and require proper S3 service keys

### Unchanged Behavior (Regression Prevention)

3.1 WHEN valid files are uploaded to existing lessons THEN the system SHALL CONTINUE TO follow the lessons/{lesson_id}/materials/ path structure

3.2 WHEN LearningMaterial models are created after successful uploads THEN the system SHALL CONTINUE TO store correct metadata (file_name, file_type, file_size)

3.3 WHEN file access permissions are checked THEN the system SHALL CONTINUE TO respect lesson ownership and teacher permissions

3.4 WHEN file validation occurs during uploads THEN the system SHALL CONTINUE TO enforce file type restrictions (pdf, docx, pptx, doc, ppt, txt) and size limits (51200KB)

3.5 WHEN database operations occur for learning materials THEN the system SHALL CONTINUE TO maintain referential integrity between lessons and materials

3.6 WHEN error logging occurs during storage operations THEN the system SHALL CONTINUE TO log detailed error information without exposing sensitive credentials

## Glossary

**JWT Token**: JSON Web Token used for database authentication in Supabase, containing encoded claims and signatures separated by dots (.). Not suitable for S3 storage API authentication.

**S3 Service Keys**: Access key and secret key pair specifically designed for S3-compatible storage API authentication. Required for Supabase storage operations.

**Supabase Storage**: S3-compatible storage service provided by Supabase that requires dedicated service keys, not JWT tokens used for database access.

**Storage Disk**: Laravel storage configuration that defines how files are stored and accessed, configured through filesystem.php.

**RLS Policies**: Row Level Security policies in Supabase that control access to storage buckets and objects.

**Learning Material**: Database model representing uploaded educational content files associated with lessons and teachers.