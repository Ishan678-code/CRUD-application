const express = require("express");
const { generatePDF } = require("./process.js");
const mysql = require("mysql2");
const { save } = require("./database.js");

const port = 8000;
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "client",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to the MySQL server.");
});

const app = express();
app.use(express.json());

// POST route to save data and generate PDF
app.post("/json-data", (req, res) => {
  const data = req.body;
  save(data);

  const doc = generatePDF(data);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment;filename="Resume.pdf"');
  doc.pipe(res);
  doc.end();
});

app.get("/json-data", (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send("Query parameter 'email' must be provided.");
  }

  const userQuery = "SELECT * FROM users WHERE email = ?";
  connection.query(userQuery, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user data:", err);
      return res.status(500).send("Failed to retrieve user data");
    }

    if (results.length === 0) {
      return res.status(404).send("No user found with the provided email");
    }

    const user = results[0];
    const userId = user.id;

    const skillsQuery = "SELECT skill_name FROM skills WHERE user_id = ?";
    const educationQuery =
      "SELECT school_name, logo, level, title, year FROM education WHERE user_id = ?";
    const experiencesQuery =
      "SELECT company, company_logo, position, work_year, duties FROM experiences WHERE user_id = ?";

    connection.query(skillsQuery, [userId], (err, skills) => {
      if (err) {
        console.error("Error fetching skills:", err);
        return res.status(500).send("Failed to retrieve skills");
      }

      connection.query(educationQuery, [userId], (err, education) => {
        if (err) {
          console.error("Error fetching education:", err);
          return res.status(500).send("Failed to retrieve education");
        }

        connection.query(experiencesQuery, [userId], (err, experiences) => {
          if (err) {
            console.error("Error fetching experiences:", err);
            return res.status(500).send("Failed to retrieve experiences");
          }

          const userData = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            skills: skills.map((skill) => skill.skill_name),
            education: education.map((edu) => ({
              school_name: edu.school_name,
              logo: edu.logo,
              level: edu.level,
              title: edu.title,
              year: edu.year,
            })),
            experiences: experiences.map((exp) => ({
              company: exp.company,
              company_logo: exp.company_logo,
              position: exp.position,
              work_year: exp.work_year,
              duties: exp.duties.split(", "),
            })),
          };

          const doc = generatePDF(userData);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            'attachment;filename="Resume.pdf"'
          );
          doc.pipe(res);
          doc.end();
        });
      });
    });
  });
});
app.patch("/json-data", (req, res) => {
  const email = req.query.email;
  const newbody = req.body;

  if (!email) {
    return res.status(400).send("Query parameter 'email' must be provided.");
  }


  const userFields = [];
  const userValues = [];

  const userKeys = Object.keys(newbody);
  for (let i = 0; i < userKeys.length; i++) {
    const field = userKeys[i];
    if (field !== 'skills' && field !== 'education' && field !== 'experiences') {
      userFields.push(`${field} = ?`);
      userValues.push(newbody[field]);
    }
  }

  if (userFields.length > 0) {
    const updateUserQuery = `UPDATE users SET ${userFields.join(', ')} WHERE email = ?`;
    userValues.push(email);

    connection.query(updateUserQuery, userValues, (err) => {
      if (err) {
        console.error("Error updating user table:", err);
        return res.status(500).send("Failed to update user data.");
      }
    });
  }

  
  const userIdQuery = "SELECT id FROM users WHERE email = ?";
  connection.query(userIdQuery, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).send("Failed to retrieve user ID.");
    }

    const userId = results[0].id;


    if (newbody.skills) {
      const newSkills = newbody.skills;

      const existingSkillsQuery = "SELECT skill_name FROM skills WHERE user_id = ?";
      connection.query(existingSkillsQuery, [userId], (err, existingSkillsResults) => {
        if (err) {
          console.error("Error fetching existing skills:", err);
          return res.status(500).send("Failed to retrieve existing skills.");
        }

        const existingSkills = existingSkillsResults.map(skill => skill.skill_name);
        const skillsToAdd = newSkills.filter(skill => !existingSkills.includes(skill));

        if (skillsToAdd.length > 0) {
          const skillFields = skillsToAdd.map(skill => [skill, userId]);
          const insertSkillsQuery = "INSERT INTO skills (skill_name, user_id) VALUES ?";

          connection.query(insertSkillsQuery, [skillFields], (err) => {
            if (err) {
              console.error("Error inserting new skills:", err);
              return res.status(500).send("Failed to update skills data.");
            }
          });
        }
      });
    }

    
    if (newbody.education) {
      const newEducation = newbody.education;

      const existingEducationQuery = "SELECT school_name FROM education WHERE user_id = ?";
      connection.query(existingEducationQuery, [userId], (err, existingEducationResults) => {
        if (err) {
          console.error("Error fetching existing education:", err);
          return res.status(500).send("Failed to retrieve existing education.");
        }

        const existingEducation = existingEducationResults.map(edu => edu.school_name);
        const educationToAdd = newEducation.filter(edu => !existingEducation.includes(edu.school_name));

        if (educationToAdd.length > 0) {
          const educationFields = educationToAdd.map(edu => [
            edu.school_name,
            edu.logo,
            edu.level,
            edu.title,
            edu.year,
            userId
          ]);
          const insertEducationQuery = "INSERT INTO education (school_name, logo, level, title, year, user_id) VALUES ?";

          connection.query(insertEducationQuery, [educationFields], (err) => {
            if (err) {
              console.error("Error inserting new education:", err);
              return res.status(500).send("Failed to update education data.");
            }
          });
        }
      });
    }

  
    if (newbody.experiences) {
      const newExperiences = newbody.experiences;

      const existingExperiencesQuery = "SELECT company FROM experiences WHERE user_id = ?";
      connection.query(existingExperiencesQuery, [userId], (err, existingExperiencesResults) => {
        if (err) {
          console.error("Error fetching existing experiences:", err);
          return res.status(500).send("Failed to retrieve existing experiences.");
        }

        const existingExperiences = existingExperiencesResults.map(exp => exp.company);
        const experiencesToAdd = newExperiences.filter(exp => !existingExperiences.includes(exp.company));

        if (experiencesToAdd.length > 0) {
          const experienceFields = experiencesToAdd.map(exp => [
            exp.company,
            exp.company_logo,
            exp.position,
            exp.work_year,
            exp.duties,
            userId
          ]);
          const insertExperiencesQuery = "INSERT INTO experiences (company, company_logo, position, work_year, duties, user_id) VALUES ?";

          connection.query(insertExperiencesQuery, [experienceFields], (err) => {
            if (err) {
              console.error("Error inserting new experiences:", err);
              return res.status(500).send("Failed to update experiences data.");
            }
          });
        }
      });
    }

    // Fetch updated user data
    const userQuery = "SELECT * FROM users WHERE id = ?";
    connection.query(userQuery, [userId], (err, userResults) => {
      if (err) {
        console.error("Error fetching user data:", err);
        return res.status(500).send("Failed to retrieve user data.");
      }

      const user = userResults[0];

      const skillsQuery = "SELECT skill_name FROM skills WHERE user_id = ?";
      const educationQuery = "SELECT school_name, logo, level, title, year FROM education WHERE user_id = ?";
      const experiencesQuery = "SELECT company, company_logo, position, work_year, duties FROM experiences WHERE user_id = ?";

      connection.query(skillsQuery, [userId], (err, skillsResults) => {
        if (err) {
          console.error("Error fetching skills:", err);
          return res.status(500).send("Failed to retrieve skills.");
        }

        connection.query(educationQuery, [userId], (err, educationResults) => {
          if (err) {
            console.error("Error fetching education:", err);
            return res.status(500).send("Failed to retrieve education.");
          }

          connection.query(experiencesQuery, [userId], (err, experiencesResults) => {
            if (err) {
              console.error("Error fetching experiences:", err);
              return res.status(500).send("Failed to retrieve experiences.");
            }

            const userData = {
              name: user.name,
              email: user.email,
              phone: user.phone,
              skills: skillsResults.map(skill => skill.skill_name),
              education: educationResults.map(edu => ({
                school_name: edu.school_name,
                logo: edu.logo,
                level: edu.level,
                title: edu.title,
                year: edu.year,
              })),
              experiences: experiencesResults.map(exp => ({
                company: exp.company,
                company_logo: exp.company_logo,
                position: exp.position,
                work_year: exp.work_year,
                duties: exp.duties.split(", "),
              }))
            };

            // Generate the updated PDF
            const doc = generatePDF(userData);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'attachment;filename="Updated_Resume.pdf"');
            doc.pipe(res);
            doc.end();
          });
        });
      });
    });
  });
});


app.delete("/json-data", (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send("Query parameter 'email' must be provided.");
  }

  const userIdQuery = "SELECT id FROM users WHERE email = ?";
  connection.query(userIdQuery, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).send("Failed to retrieve user data.");
    }

    const userId = results[0].id;

    const deleteSkillsQuery = "DELETE FROM skills WHERE user_id = ?";
    connection.query(deleteSkillsQuery, [userId], (err) => {
      if (err) {
        console.error("Error deleting skills:", err);
        return res.status(500).send("Failed to delete skills record.");
      }

      const deleteExperiencesQuery =
        "DELETE FROM experiences WHERE user_id = ?";
      connection.query(deleteExperiencesQuery, [userId], (err) => {
        if (err) {
          console.error("Error deleting experiences:", err);
          return res.status(500).send("Failed to delete experiences record.");
        }

        const deleteEducationQuery = "DELETE FROM education WHERE user_id = ?";
        connection.query(deleteEducationQuery, [userId], (err) => {
          if (err) {
            console.error("Error deleting education:", err);
            return res.status(500).send("Failed to delete education record.");
          }

          const deleteUserQuery = "DELETE FROM users WHERE id = ?";
          connection.query(deleteUserQuery, [userId], (err) => {
            if (err) {
              console.error("Error deleting user:", err);
              return res.status(500).send("Failed to delete user record.");
            }

            console.log("All records deleted successfully.");
            res.send("User and related records deleted successfully.");
          });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log("Server running on http://localhost:${port}");
});
