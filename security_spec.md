# Security Specification - MedStratify

## 1. Data Invariants
- A QCM must belong to a Course (courseId).
- Only the Admin (karimbenali31032002@gmail.com) can create or modify Courses and QCMs.
- Regular users can only read Courses and QCMs.
- Users can only create, read, update, or delete their OWN ratings.
- A user cannot list other users' ratings.

## 2. The "Dirty Dozen" Payloads (Attacks)
1. **Identity Spoofing**: Attempt to create a Course with a fake admin email.
2. **State Shortcutting**: Attempt to update a QCM's answer field as a regular user.
3. **Resource Poisoning**: Use a 1MB string as a Course ID.
4. **PII Leak**: Attempt to list all `userRatings` without a filter on personal `userId`.
5. **Orphaned Write**: Create a QCM with a `courseId` that doesn't exist.
6. **Shadow Update**: Update a rating and try to change the `userId` to another user.
7. **Negative Size**: Create a Course with -1 `qcmCount`.
8. **Extreme Payload**: Try to add 100 attachments to a Course (limit is 20).
9. **Unverified Email**: Attempt access with an unverified email account.
10. **Type Confusion**: Send a string for `answerIndices` (expected array).
11. **Direct ID Injection**: Try to update `/qcms/root_config` with junk data.
12. **Cross-User Delete**: Attempt to delete another user's rating.

## 3. Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| /courses | BLOCKED (isAdmin) | BLOCKED (isAdmin) | BLOCKED (isValidId) |
| /qcms | BLOCKED (isAdmin) | BLOCKED (isAdmin) | BLOCKED (isValidId) |
| /userRatings| BLOCKED (isOwner) | BLOCKED (isValidRating) | BLOCKED (isValidId) |
