// grading
export const GRADING_LEVEL_ALREADY_EXISTS = 'Grading level already exists';

// activity
export const ACTIVITY_ALREADY_EXISTS =
  'An activity with this name already exists in your school';
export const ACTIVITY_NOT_FOUND = 'Activity not found';
export const ACTIVITY_NOT_IN_SCHOOL =
  'This activity does not belong to your school';

// template
export const TEMPLATE_ALREADY_EXISTS =
  'Template with given name already exists';

// learning area
export const LEARNING_AREA_ALREADY_EXISTS =
  'A learning area with this name already exists in your school';
export const LEARNING_AREA_NOT_FOUND = 'Learning area not found';
export const LEARNING_AREA_HAS_ACTIVE_REPORTS =
  'Cannot delete a learning area that is referenced by existing reports';

// report snapshot (phase 3)
export const SNAPSHOT_NOT_FOUND = 'Report snapshot not found';
export const SNAPSHOT_ALREADY_PUBLISHED =
  'A published snapshot already exists for this student and period. Create a new snapshot instead.';
export const SNAPSHOT_CANNOT_PUBLISH =
  'Snapshot must be reviewed before publishing. Use the review endpoint first.';

// daily report
export const DAILY_REPORT_NOT_FOUND = 'Observation not found';
export const STUDENT_NOT_FOUND = 'Student not found';
export const STUDENT_NOT_IN_SCHOOL =
  'This student does not belong to your school';
export const NOT_CHILDS_GUARDIAN =
  'You do not have a guardian relationship with this student';
export const INVALID_RAW_VALUE =
  'Invalid grade value for this activity type';
export const NUMERIC_VALUE_OUT_OF_RANGE =
  'Numeric grade value is out of the allowed range';
export const FREQUENCY_VALUE_OUT_OF_RANGE =
  'Frequency count exceeds the maximum configured for this activity';
