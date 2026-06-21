import { ALL_COURSE_SPECS } from "./courseCatalog";
import { expandCourses } from "./factory";

export const PROJECT_COURSES_FROM_UNITS = expandCourses(ALL_COURSE_SPECS);
