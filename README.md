<p align="center">
  <img
    src="https://raw.githubusercontent.com/muedgar/kindora-assets/main/logo.svg"
    width="120"
    alt="Kindora Logo"
  />
</p>

<p align="center">
  A secure, privacy-first backend service for childcare management platforms,
  built with <a href="https://nodejs.org" target="_blank">Node.js</a> and
  <a href="https://nestjs.com" target="_blank">NestJS</a>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status" />
  <img src="https://img.shields.io/badge/language-TypeScript-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/framework-NestJS-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## Description

**Kindora Backend** is the core service powering the Kindora childcare management platform.

It acts as the **system of record** for daycare and nursery operations, enabling:

- Daily activity and lesson management
- Attendance tracking (check-in / check-out)
- Parent ↔ teacher communication
- Child progress observations (non-evaluative)
- Secure media sharing
- Role-based access to sensitive child data

The system is designed around **Montessori principles**, emphasizing **qualitative observation**, privacy, and trust — not grading or comparison.

---

## Core Principles

The backend SHALL:

- Enforce strict role-based access control
- Protect child and medical data by default
- Avoid scores, rankings, or competitive metrics
- Maintain audit trails for sensitive actions
- Support English and French localization
- Serve as a long-term stable data foundation

---

## User Roles

### Parent
Read-only access to their own child’s data.

**Can**
- View daily lessons and activities
- View attendance history
- View progress observations
- View classroom media
- Message assigned teachers

**Cannot**
- Modify lessons or attendance
- Access other children’s data

---

### Teacher / Caregiver
Responsible for one or more classrooms.

**Can**
- Create and publish daily lessons
- Record attendance
- Add qualitative progress observations
- Upload photos and videos
- Communicate with assigned parents

**Cannot**
- Access system-wide configuration
- View data outside assigned classrooms

---

### Administrator
Daycare-level authority.

**Can**
- Manage users and roles
- Create classrooms
- Assign teachers and children
- Manage curriculum content
- Access operational reports
- Override attendance (audited)

---

## Functional Modules

- **User & Role Management**
- **Child & Parent Profiles**
- **Classrooms**
- **Daily Lessons & Activities**
- **Child Observations**
- **Attendance Management**
- **Media Uploads & Access Control**
- **Messaging & Announcements**
- **Notifications**
- **Reporting**
- **Audit & Privacy Controls**
- **Localization (EN / FR)**

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM (implementation-dependent)
- **Auth**: JWT / Role-based Guards
- **Storage**: Object storage (S3-compatible)
- **Notifications**: In-app + Push (optional)

---

## Project Setup

```bash
$ npm install
