import express from "express";
import dotenv from "dotenv";
import { connectToDB, getDB } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Helpers
async function getNextId(collectionName) {
  const db = getDB();
  const doc = await db
    .collection(collectionName)
    .find({})
    .sort({ id: -1 })
    .limit(1)
    .toArray();

  if (doc.length === 0) return 1;
  return Number(doc[0].id) + 1;
}

// Optional root route so "/" doesn't show Cannot GET /
app.get("/", (req, res) => {
  res.send("School API running. Try /students, /teachers, /courses, /tests");
});

/* -------------------- TEACHERS -------------------- */
app.get("/teachers", async (req, res) => {
  const db = getDB();
  const teachers = await db.collection("teachers").find({}).toArray();
  res.json(teachers);
});

app.get("/teachers/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const teacher = await db.collection("teachers").findOne({ id });
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });

  res.json(teacher);
});

app.post("/teachers", async (req, res) => {
  const db = getDB();
  const { firstName, lastName, email, department, room } = req.body;

  if (!firstName || !lastName || !email || !department) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newTeacher = {
    id: await getNextId("teachers"),
    firstName,
    lastName,
    email,
    department,
    room: room || ""
  };

  await db.collection("teachers").insertOne(newTeacher);
  res.status(201).json(newTeacher);
});

app.put("/teachers/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const updates = {};
  const { firstName, lastName, email, department, room } = req.body;

  if (
    firstName === undefined &&
    lastName === undefined &&
    email === undefined &&
    department === undefined &&
    room === undefined
  ) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (email !== undefined) updates.email = email;
  if (department !== undefined) updates.department = department;
  if (room !== undefined) updates.room = room;

  const result = await db.collection("teachers").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!result) return res.status(404).json({ error: "Teacher not found" });
  res.json(result);
});

app.delete("/teachers/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const usedInCourse = await db.collection("courses").findOne({ teacherId: id });
  if (usedInCourse) {
    return res.status(400).json({
      error: "Cannot delete teacher that is used in course. Delete or update those courses first."
    });
  }

  const deleted = await db.collection("teachers").findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Teacher not found" });

  res.json(deleted);
});

/* -------------------- COURSES -------------------- */
app.get("/courses", async (req, res) => {
  const db = getDB();
  const courses = await db.collection("courses").find({}).toArray();
  res.json(courses);
});

app.get("/courses/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const course = await db.collection("courses").findOne({ id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  res.json(course);
});

app.post("/courses", async (req, res) => {
  const db = getDB();
  const { code, name, teacherId, semester, room, schedule } = req.body;

  if (!code || !name || !teacherId || !semester || !room) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const teacherExists = await db.collection("teachers").findOne({ id: Number(teacherId) });
  if (!teacherExists) {
    return res.status(400).json({ error: "teacherId must be a valid teacher id" });
  }

  const newCourse = {
    id: await getNextId("courses"),
    code,
    name,
    teacherId: Number(teacherId),
    semester,
    room,
    schedule: schedule || ""
  };

  await db.collection("courses").insertOne(newCourse);
  res.status(201).json(newCourse);
});

app.put("/courses/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const { code, name, teacherId, semester, room, schedule } = req.body;

  if (
    code === undefined &&
    name === undefined &&
    teacherId === undefined &&
    semester === undefined &&
    room === undefined &&
    schedule === undefined
  ) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  const updates = {};
  if (teacherId !== undefined) {
    const teacherExists = await db.collection("teachers").findOne({ id: Number(teacherId) });
    if (!teacherExists) {
      return res.status(400).json({ error: "teacherId must be a valid teacher id" });
    }
    updates.teacherId = Number(teacherId);
  }

  if (code !== undefined) updates.code = code;
  if (name !== undefined) updates.name = name;
  if (semester !== undefined) updates.semester = semester;
  if (room !== undefined) updates.room = room;
  if (schedule !== undefined) updates.schedule = schedule;

  const updated = await db.collection("courses").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!updated) return res.status(404).json({ error: "Course not found" });
  res.json(updated);
});

app.delete("/courses/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const containsTest = await db.collection("tests").findOne({ courseId: id });
  if (containsTest) {
    return res.status(400).json({
      error: "Cannot delete course that contains test. Delete or update those tests first."
    });
  }

  const deleted = await db.collection("courses").findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Course not found" });

  res.json(deleted);
});

/* -------------------- STUDENTS -------------------- */
app.get("/students", async (req, res) => {
  const db = getDB();
  const students = await db.collection("students").find({}).toArray();
  res.json(students);
});

app.get("/students/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const student = await db.collection("students").findOne({ id });
  if (!student) return res.status(404).json({ error: "Student not found" });

  res.json(student);
});

app.post("/students", async (req, res) => {
  const db = getDB();
  const { firstName, lastName, grade, studentNumber, homeroom } = req.body;

  if (!firstName || !lastName || !grade || !studentNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newStudent = {
    id: await getNextId("students"),
    firstName,
    lastName,
    grade: Number(grade),
    studentNumber,
    homeroom: homeroom || ""
  };

  await db.collection("students").insertOne(newStudent);
  res.status(201).json(newStudent);
});

app.put("/students/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const { firstName, lastName, grade, studentNumber, homeroom } = req.body;

  if (
    firstName === undefined &&
    lastName === undefined &&
    grade === undefined &&
    studentNumber === undefined &&
    homeroom === undefined
  ) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (grade !== undefined) updates.grade = Number(grade);
  if (studentNumber !== undefined) updates.studentNumber = studentNumber;
  if (homeroom !== undefined) updates.homeroom = homeroom;

  const updated = await db.collection("students").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!updated) return res.status(404).json({ error: "Student not found" });
  res.json(updated);
});

app.delete("/students/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const containsTest = await db.collection("tests").findOne({ studentId: id });
  if (containsTest) {
    return res.status(400).json({
      error: "Cannot delete student has test. Delete or update those tests first."
    });
  }

  const deleted = await db.collection("students").findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Student not found" });

  res.json(deleted);
});

/* -------------------- TESTS -------------------- */
app.get("/tests", async (req, res) => {
  const db = getDB();
  const tests = await db.collection("tests").find({}).toArray();
  res.json(tests);
});

app.get("/tests/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const test = await db.collection("tests").findOne({ id });
  if (!test) return res.status(404).json({ error: "Test not found" });

  res.json(test);
});

app.post("/tests", async (req, res) => {
  const db = getDB();
  const { studentId, courseId, testName, date, mark, outOf, weight } = req.body;

  if (!studentId || !courseId || !testName || !date || mark === undefined || outOf === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const studentExists = await db.collection("students").findOne({ id: Number(studentId) });
  if (!studentExists) return res.status(400).json({ error: "studentId must be a valid student id" });

  const courseExists = await db.collection("courses").findOne({ id: Number(courseId) });
  if (!courseExists) return res.status(400).json({ error: "courseId must be a valid course id" });

  const newTest = {
    id: await getNextId("tests"),
    studentId: Number(studentId),
    courseId: Number(courseId),
    testName,
    date,
    mark: Number(mark),
    outOf: Number(outOf),
    weight: weight !== undefined ? Number(weight) : null
  };

  await db.collection("tests").insertOne(newTest);
  res.status(201).json(newTest);
});

app.put("/tests/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const { studentId, courseId, testName, date, mark, outOf, weight } = req.body;

  if (
    studentId === undefined &&
    courseId === undefined &&
    testName === undefined &&
    date === undefined &&
    mark === undefined &&
    outOf === undefined &&
    weight === undefined
  ) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  const updates = {};

  if (studentId !== undefined) {
    const studentExists = await db.collection("students").findOne({ id: Number(studentId) });
    if (!studentExists) return res.status(400).json({ error: "studentId must be a valid student id" });
    updates.studentId = Number(studentId);
  }

  if (courseId !== undefined) {
    const courseExists = await db.collection("courses").findOne({ id: Number(courseId) });
    if (!courseExists) return res.status(400).json({ error: "courseId must be a valid course id" });
    updates.courseId = Number(courseId);
  }

  if (testName !== undefined) updates.testName = testName;
  if (date !== undefined) updates.date = date;
  if (mark !== undefined) updates.mark = Number(mark);
  if (outOf !== undefined) updates.outOf = Number(outOf);
  if (weight !== undefined) updates.weight = weight === null ? null : Number(weight);

  const updated = await db.collection("tests").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!updated) return res.status(404).json({ error: "Test not found" });
  res.json(updated);
});

app.delete("/tests/:id", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const deleted = await db.collection("tests").findOneAndDelete({ id });
  if (!deleted) return res.status(404).json({ error: "Test not found" });

  res.json(deleted);
});

/* -------------------- EXTRA ENDPOINTS -------------------- */
app.get("/students/:id/tests", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const student = await db.collection("students").findOne({ id });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const studentTests = await db.collection("tests").find({ studentId: id }).toArray();
  res.json(studentTests);
});

app.get("/courses/:id/tests", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const course = await db.collection("courses").findOne({ id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const courseTests = await db.collection("tests").find({ courseId: id }).toArray();
  res.json(courseTests);
});

app.get("/students/:id/average", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const student = await db.collection("students").findOne({ id });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const studentTests = await db.collection("tests").find({ studentId: id }).toArray();
  if (studentTests.length === 0) return res.status(404).json({ error: "No tests found for this student" });

  const totalPercent = studentTests.reduce((sum, te) => sum + (te.mark / te.outOf) * 100, 0);
  const average = totalPercent / studentTests.length;

  res.json({ studentId: id, average: Number(average.toFixed(2)), testCount: studentTests.length });
});

app.get("/courses/:id/average", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const course = await db.collection("courses").findOne({ id });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const courseTests = await db.collection("tests").find({ courseId: id }).toArray();
  if (courseTests.length === 0) return res.status(404).json({ error: "No tests found for this course" });

  const totalPercent = courseTests.reduce((sum, te) => sum + (te.mark / te.outOf) * 100, 0);
  const average = totalPercent / courseTests.length;

  res.json({ courseId: id, average: Number(average.toFixed(2)), testCount: courseTests.length });
});

app.get("/teachers/:id/summary", async (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);

  const teacher = await db.collection("teachers").findOne({ id });
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });

  const rightCourses = await db.collection("courses").find({ teacherId: id }).toArray();

  const courseSummaries = await Promise.all(
    rightCourses.map(async (c) => {
      const testCount = await db.collection("tests").countDocuments({ courseId: c.id });
      return { courseId: c.id, courseName: c.name, testCount };
    })
  );

  res.status(200).json({
    teacherId: id,
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
    courses: courseSummaries
  });
});

// Start after DB connects
async function start() {
  await connectToDB();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});