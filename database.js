const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'client'
});

connection.connect(err => {
  if (err) throw err;
  console.log('Connected to the MySQL server.');
});

function save(json) {
  
  const { name, email, phone, url, skills, education, experiences } = json;

  // Check if user with the email already exists
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err) throw err;

      if (results.length === 0) {
        
        connection.query(
          'INSERT INTO users (name, email, phone, url) VALUES (?, ?, ?, ?)',
          [name, email, phone, url],
          (err, result) => {
            if (err) throw err;
            console.log('Inserted user:', name);

            const userId = result.insertId;

            // Insert skills
            skills.forEach(skill => {
              connection.query(
                'INSERT INTO skills (user_id, skill_name) VALUES (?, ?)',
                [userId, skill],
                (err, results) => {
                  if (err) throw err;
                  console.log('Inserted skill:', skill);
                }
              );
            });

            // Insert education
            education.forEach(edu => {
              connection.query(
                'INSERT INTO education (user_id, school_name, logo, level, title, year) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, edu.school_name, edu.logo, edu.level, edu.title, edu.year],
                (err, results) => {
                  if (err) throw err;
                  console.log('Inserted education:', edu.school_name);
                }
              );
            });

            // Insert experiences
            experiences.forEach(exp => {
              const duties = exp.duties.join(', ');
              connection.query(
                'INSERT INTO experiences (user_id, company, company_logo, position, work_year, duties) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, exp.company, exp.company_logo, exp.position, exp.work_year, duties],
                (err, results) => {
                  if (err) throw err;
                  console.log('Inserted experience:', exp.company);
                }
              );
            });
          }
        );
      } else {
        console.log('User with this email already exists:', email);
      }
    }
  );
}

module.exports={save};

