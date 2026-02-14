# ETAPA 4: User Documents Implementation Summary

## Overview
Implemented document verification system for professional users with file upload capability.

## Changes Made

### 1. Database Schema (prisma/schema.prisma)

#### New Enums
```prisma
enum DocumentType {
  SELFIE_WITH_DOCUMENT
  ID_DOCUMENT
}

enum DocumentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### New Model
```prisma
model UserDocument {
  id                  String           @id @default(cuid())
  userId              String           @map("user_id")
  user                User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type                DocumentType
  url                 String
  status              DocumentStatus   @default(PENDING)
  rejectionReason     String?          @db.Text @map("rejection_reason")
  reviewedAt          DateTime?        @map("reviewed_at")
  createdAt           DateTime         @default(now()) @map("created_at")
  updatedAt           DateTime         @updatedAt @map("updated_at")
  
  @@map("user_documents")
  @@index([userId])
  @@index([type])
  @@index([status])
}
```

#### User Model Changes
- Removed: `verificationDocs String[]` (old array of URLs)
- Added: `documents UserDocument[]` (proper 1:many relationship)

### 2. Database Migration
- **File**: `20260214165614_add_user_documents`
- **Actions**:
  - Dropped dependent views (CASCADE)
  - Created DocumentType and DocumentStatus enums
  - Dropped verificationDocs column from users
  - Created user_documents table
  - Recreated views with updated schema

### 3. File Upload Endpoint

**Route**: `POST /api/uploads`
**Handler**: `src/routes/upload.route.ts`

```typescript
// Request (multipart/form-data)
{
  file: <binary>
}

// Response (200 OK)
{
  url: "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
  filename: "550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

**Features**:
- Accepts multipart/form-data
- Validates file types: JPEG, PNG, WebP, PDF
- Max file size: 10MB
- Saves to `uploads/` directory (local filesystem for MVP)
- Returns relative URL for storage in database
- Never stores base64 in database

### 4. Professional Signup Flow (Mandatory Documents)

**Updated**: `src/services/auth.service.ts::register()`

**Requirements for PROFESSIONAL users**:
- ✅ Avatar is mandatory
- ✅ Two documents are mandatory (SELFIE_WITH_DOCUMENT + ID_DOCUMENT)
- ✅ All data wrapped in single transaction

**Process**:
1. Validate avatar URL provided
2. Validate exactly 2 documents provided with correct types
3. Create user with avatar
4. Create ProfessionalProfile
5. Create 2 UserDocument records (both with PENDING status)
6. Assign services/categories (if provided)

**Example Request**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SecurePass123!",
  "phone": "11999999999",
  "cpf": "12345678901",
  "userType": "PROFESSIONAL",
  "avatar": "https://storage.example.com/avatar-123.jpg",
  "documents": [
    {
      "type": "SELFIE_WITH_DOCUMENT",
      "url": "https://storage.example.com/doc-selfie-123.jpg"
    },
    {
      "type": "ID_DOCUMENT",
      "url": "https://storage.example.com/doc-id-123.jpg"
    }
  ],
  "primaryCategoryId": 1,
  "experienceRange": "2-5 anos",
  "description": "Profissional experiente...",
  "services": [
    {
      "subcategoryId": 1,
      "price": "150,00"
    }
  ]
}
```

### 5. Document Management Endpoints

**Route File**: `src/routes/document.route.ts`

#### GET /api/documents
**Authentication**: Required (JWT Bearer)
**Description**: List all documents for authenticated user

Response:
```json
{
  "documents": [
    {
      "id": "doc-123",
      "type": "SELFIE_WITH_DOCUMENT",
      "url": "https://storage.example.com/doc.jpg",
      "status": "PENDING",
      "rejectionReason": null,
      "reviewedAt": null,
      "createdAt": "2025-02-14T13:50:00Z",
      "updatedAt": "2025-02-14T13:50:00Z"
    }
  ]
}
```

#### GET /api/documents/:documentId
**Authentication**: Required
**Description**: Get specific document (user must own it)

#### POST /api/documents
**Authentication**: Required
**Description**: Add new verification document

Request:
```json
{
  "type": "SELFIE_WITH_DOCUMENT",
  "url": "https://storage.example.com/new-doc.jpg"
}
```

**Rules**:
- Cannot have duplicate types for same user
- Document automatically set to PENDING status

#### PUT /api/documents/:documentId
**Authentication**: Required
**Description**: Update document URL (re-review)

Request:
```json
{
  "url": "https://storage.example.com/updated-doc.jpg"
}
```

**Behavior**:
- Updates URL
- Resets status to PENDING for re-review
- Clears previous rejection reason

#### DELETE /api/documents/:documentId
**Authentication**: Required
**Description**: Delete document (user must own it)

Response: 204 No Content

### 6. User Profile Endpoints Updated

#### GET /users/me (Updated)
**Includes**:
```json
{
  "id": "user-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "userType": "PROFESSIONAL",
  "avatar": "https://...",
  "documents": [
    {
      "id": "doc-123",
      "type": "SELFIE_WITH_DOCUMENT",
      "url": "https://...",
      "status": "PENDING",
      "createdAt": "2025-02-14T13:50:00Z"
    }
  ],
  "professionalProfile": { /* ... */ }
}
```

#### GET /api/professionals/:professionalId (Updated)
**Includes documents array** with same structure

### 7. Packages Added
```json
{
  "@fastify/multipart": "^8.x",
  "@fastify/static": "^6.x",
  "uuid": "^9.x"
}
```

## File Structure

```
valet-backend/
├── src/
│   ├── routes/
│   │   ├── document.route.ts       (NEW - document CRUD endpoints)
│   │   ├── upload.route.ts         (NEW - file upload handler)
│   │   ├── auth.route.ts           (UPDATED - calls updated register)
│   │   ├── users.route.ts          (UPDATED - includes documents in /me)
│   │   └── professional.route.ts   (UPDATED - includes documents in detail)
│   ├── services/
│   │   └── auth.service.ts         (UPDATED - handle documents in signup)
│   └── schemas/
│       └── user.schema.ts          (UPDATED - registerSchema with document validation)
├── prisma/
│   ├── schema.prisma               (UPDATED - UserDocument model + enums)
│   └── migrations/
│       └── 20260214165614_add_user_documents/
│           └── migration.sql       (NEW - migration script)
├── uploads/                        (NEW - local file storage directory)
├── app.ts                          (UPDATED - register upload/document routes)
└── .gitignore                      (UPDATED - ignore uploads directory)
```

## Flow Diagram

### Professional Signup Flow
```
1. Client uploads avatar → POST /api/uploads → get avatar URL
2. Client uploads doc 1 → POST /api/uploads → get doc1 URL
3. Client uploads doc 2 → POST /api/uploads → get doc2 URL
4. Client sends registration with all URLs
   ↓
   POST /auth/register
   {
     userType: "PROFESSIONAL",
     avatar: <url>,
     documents: [
       { type: "SELFIE_WITH_DOCUMENT", url: <url> },
       { type: "ID_DOCUMENT", url: <url> }
     ]
   }
   ↓
5. Server validates all required fields
6. Creates User with avatar
7. Creates ProfessionalProfile
8. Creates 2 UserDocument records (PENDING)
9. Returns accessToken + refreshToken
```

### Document Update Flow
```
1. Client uploads new document → POST /api/uploads → get URL
2. PUT /api/documents/:id with new URL
3. Server updates URL and resets status to PENDING
4. Admin reviews and updates status to APPROVED/REJECTED
5. Client can view status via GET /api/documents
```

## Validation Rules

### Professional Signup
- ✅ Avatar: Required for professionals (URL format)
- ✅ Documents: Exactly 2 required (SELFIE_WITH_DOCUMENT + ID_DOCUMENT)
- ✅ Document URLs: Must be valid URLs (not base64)

### Document Management
- ✅ No duplicate document types per user
- ✅ User can only view/modify own documents
- ✅ Updating resets status to PENDING

### File Upload
- ✅ Max size: 10MB
- ✅ Allowed types: JPEG, PNG, WebP, PDF
- ✅ Files saved with UUID filename to prevent collisions

## Testing Checklist

- [ ] POST /api/uploads - Upload image file (returns URL)
- [ ] POST /auth/register - Professional signup with documents
  - [ ] Missing avatar → 400 error
  - [ ] Missing/incomplete documents → 400 error
  - [ ] Valid signup → creates user + profile + documents
- [ ] GET /users/me - Includes documents array
- [ ] GET /api/professionals/:id - Includes documents array
- [ ] GET /api/documents - List user documents
- [ ] GET /api/documents/:id - Get single document
- [ ] POST /api/documents - Add new document (duplicate type → error)
- [ ] PUT /api/documents/:id - Update document URL (status resets)
- [ ] DELETE /api/documents/:id - Delete document

## Future Enhancements

1. **Cloud Storage**: Replace local uploads/ with S3/Cloudinary/Supabase
2. **Admin Dashboard**: Endpoint to review/approve/reject documents
3. **Document Expiration**: Add expiration date logic
4. **Versioning**: Track document history
5. **Automatic Verification**: Integrate with document verification API
6. **Notifications**: Alert user when document is reviewed

## Notes

- Database is clean and up-to-date (16 migrations applied)
- Prisma Client regenerated with UserDocument model
- No TypeScript errors in new code
- All transactions properly wrapped for data consistency
- Local file storage used for MVP (production-ready for cloud storage)
