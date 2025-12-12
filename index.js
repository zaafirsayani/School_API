const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());


const TEACHERS_FILE = path.join(__dirname, "data/teachers.json");
const STUDENTS_FILE = path.join(__dirname, "data/students.json");
const COURSES_FILE = path.join(__dirname, "data/courses.json");
const TESTS_FILE = path.join(__dirname, "data/tests.json");


function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error("Error parsing", filePath, err);
    return [];
  }
}


function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}


let teachers = loadJson(TEACHERS_FILE);
let students = loadJson(STUDENTS_FILE);
let courses = loadJson(COURSES_FILE);
let tests = loadJson(TESTS_FILE);


let nextTeacherId = teachers.reduce((max, t) => Math.max(max, t.id), 0) + 1;
let nextStudentId = students.reduce((max, s) => Math.max(max, s.id), 0) + 1;
let nextCourseId = courses.reduce((max, c) => Math.max(max, c.id), 0) + 1;
let nextTestId = tests.reduce((max, t) => Math.max(max, t.id), 0) + 1;




app.get("/teachers", (req, res) => { res.status(200).json(teachers) })


app.get("/teachers/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const teacher = teachers.find(t => t.id === id)

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" })
  }

  res.status(200).json(teacher)
})


app.post("/teachers", (req, res) => {
  const { firstName, lastName, email, department } = req.body

  if (!firstName || !lastName || !email || !department) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const newTeacher = {
    id: nextTeacherId++,
    firstName,
    lastName,
    email,
    department
  }

  teachers.push(newTeacher)
  saveJson("teachers.json", teachers)

  res.status(201).json(newTeacher)
})


app.put("/teachers/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const teacher = teachers.find(t => t.id === id)

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" })
  }

  const updatedFields = req.body

  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ error: "No fields provided for update" })
  }

  Object.assign(teacher, updatedFields)
  saveJson("teachers.json", teachers)

  res.status(200).json(teacher)
})


app.delete("/teachers/:id", (req, res) => {
  const id = parseInt(req.params.id)


  const isAssigned = courses.some(c => c.teacherId === id)
  if (isAssigned) {
    return res.status(400).json({ error: "Cannot delete teacher assigned to a course" })
  }

  const index = teachers.findIndex(t => t.id === id)

  if (index === -1) {
    return res.status(404).json({ error: "Teacher not found" })
  }

  teachers.splice(index, 1)
  saveJson("teachers.json", teachers)

  res.status(200).json({ message: "Teacher deleted" })
})


app.get("/courses", (req, res) => {
  res.json(courses)
})


app.get("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const course = courses.find(c => c.id === id)

  if (!course) {
    return res.status(404).json({ error: "Course not found" })
  }

  res.json(course)
})


app.post("/courses", (req, res) => {
  const { code, name, teacherId, semester, room, schedule } = req.body


  if (!code || !name || !teacherId || !semester || !room) {
    return res.status(400).json({
      error: "Missing required fields: code, name, teacherId, semester, room"
    })
  }


  const teacherExists = teachers.some(t => t.id === teacherId)
  if (!teacherExists) {
    return res.status(400).json({ error: "Invalid teacherId: teacher not found" });
  }

  const newCourse = {
    id: nextCourseId++,
    code,
    name,
    teacherId,
    semester,
    room,
    schedule: schedule || ""
  }

  courses.push(newCourse)
  saveJson(COURSES_FILE, courses)

  res.status(201).json(newCourse)
})


app.put("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id)
  const course = courses.find(c => c.id === id)

  if (!course) {
    return res.status(404).json({ error: "Course not found" })
  }

  const { code, name, teacherId, semester, room, schedule } = req.body


  if (teacherId && !teachers.some(t => t.id === teacherId)) {
    return res.status(400).json({ error: "Invalid teacherId: teacher not found" });
  }


  if (code !== undefined) course.code = code
  if (name !== undefined) course.name = name
  if (teacherId !== undefined) course.teacherId = teacherId
  if (semester !== undefined) course.semester = semester
  if (room !== undefined) course.room = room
  if (schedule !== undefined) course.schedule = schedule

  saveJson(COURSES_FILE, courses)

  res.json(course)
})


app.delete("/courses/:id", (req, res) => {
  const id = parseInt(req.params.id)

  const courseIndex = courses.findIndex(c => c.id === id)

  if (courseIndex === -1) {
    return res.status(404).json({ error: "Course not found" })
  }


  const hasTests = tests.some(t => t.courseId === id)
  if (hasTests) {
    return res.status(400).json({
      error: "Cannot delete course: tests exist for this course"
    })
  }

  const deleted = courses.splice(courseIndex, 1)
  saveJson(COURSES_FILE, courses)

  res.json({ message: "Course deleted", deleted })
})


app.get("/students", (req, res) => {
  res.json(students)
})


app.get("/students/:id", (req, res) => {
  const id = Number(req.params.id)
  const student = students.find(s => s.id === id)

  if (!student) {
    return res.status(404).json({ error: "Student not found" })
  }

  res.json(student)
})


app.post("/students", (req, res) => {
  const { firstName, lastName, grade, studentNumber } = req.body

  if (!firstName || !lastName || !grade || !studentNumber) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const newStudent = {
    id: nextStudentId++,
    firstName,
    lastName,
    grade,
    studentNumber,
    homeroom: req.body.homeroom || null
  }

  students.push(newStudent)
  saveJson(STUDENTS_FILE, students)

  res.status(201).json(newStudent)
})


app.put("/students/:id", (req, res) => {
  const id = Number(req.params.id)
  const student = students.find(s => s.id === id)

  if (!student) {
    return res.status(404).json({ error: "Student not found" })
  }

  const { firstName, lastName, grade, studentNumber, homeroom } = req.body


  if (firstName !== undefined) student.firstName = firstName
  if (lastName !== undefined) student.lastName = lastName
  if (grade !== undefined) student.grade = grade
  if (studentNumber !== undefined) student.studentNumber = studentNumber
  if (homeroom !== undefined) student.homeroom = homeroom

  saveJson(STUDENTS_FILE, students)

  res.json(student)
})


app.delete("/students/:id", (req, res) => {
  const id = Number(req.params.id)
  const studentIndex = students.findIndex(s => s.id === id)

  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" })
  }


  const hasTests = tests.some(t => t.studentId === id)
  if (hasTests) {
    return res
      .status(400)
      .json({ error: "Cannot delete student with existing test records" })
  }

  const deletedStudent = students.splice(studentIndex, 1)[0]
  saveJson(STUDENTS_FILE, students)

  res.json(deletedStudent)
})


app.get("/tests", (req, res) => { res.json(tests) })


app.get("/tests/:id", (req, res) => {
  const id = Number(req.params.id)
  const test = tests.find(t => t.id === id)

  if (!test) {
    return res.status(404).json({ error: "Test record not found" })
  }

  res.json(test)
})


app.post("/tests", (req, res) => {
  const { studentId, courseId, testName, date, mark, outOf, weight } = req.body


  if (!studentId || !courseId || !testName || !date || mark === undefined || outOf === undefined) {
    return res.status(400).json({ error: "Missing required fields" })
  }


  const validStudent = students.some(s => s.id === studentId)
  if (!validStudent) {
    return res.status(400).json({ error: "Invalid studentId" })
  }


  const validCourse = courses.some(c => c.id === courseId)
  if (!validCourse) {
    return res.status(400).json({ error: "Invalid courseId" })
  }

  const newTest = {
    id: nextTestId++,
    studentId,
    courseId,
    testName,
    date,
    mark,
    outOf,
    weight: weight || null
  }

  tests.push(newTest)
  saveJson(TESTS_FILE, tests)

  res.status(201).json(newTest)
})


app.put("/tests/:id", (req, res) => {
  const id = Number(req.params.id)
  const test = tests.find(t => t.id === id)

  if (!test) {
    return res.status(404).json({ error: "Test record not found" })
  }

  const {
    studentId,
    courseId,
    testName,
    date,
    mark,
    outOf,
    weight
  } = req.body


  if (studentId !== undefined) {
    const validStudent = students.some(s => s.id === studentId)
    if (!validStudent) {
      return res.status(400).json({ error: "Invalid studentId" })
    }
    test.studentId = studentId
  }


  if (courseId !== undefined) {
    const validCourse = courses.some(c => c.id === courseId)
    if (!validCourse) {
      return res.status(400).json({ error: "Invalid courseId" })
    }
    test.courseId = courseId
  }

  if (testName !== undefined) test.testName = testName
  if (date !== undefined) test.date = date
  if (mark !== undefined) test.mark = mark
  if (outOf !== undefined) test.outOf = outOf
  if (weight !== undefined) test.weight = weight

  saveJson(TESTS_FILE, tests)

  res.json(test)
})


app.delete("/tests/:id", (req, res) => {
  const id = Number(req.params.id)
  const index = tests.findIndex(t => t.id === id)

  if (index === -1) {
    return res.status(404).json({ error: "Test record not found" })
  }

  const deleted = tests.splice(index, 1)[0]
  saveJson(TESTS_FILE, tests)

  res.json(deleted)
})

app.get('/teachers/:id/summary', (req, res) => {
  const teacher = teachers.find(t => t.id === id)
  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" })
  }

  const teacherCourses = courses.filter(c => c.teacherId === id)

  const resultCourses = teacherCourses.map(c => {
    const testCount = tests.filter(t => t.courseId === c.id).length
    return {
      courseId: c.id,
      courseName: c.name,
      testCount: testCount
    }
  })

  res.json({
    teacherId: teacher.id,
    teacherName: teacher.firstName + " " + teacher.lastName,
    courses: resultCoutses

  });
})



app.listen(PORT, () => { console.log(`Server listening on http://localhost:${PORT}`) })
