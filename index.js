const express = require("express");
const app = express();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");

app.listen(3000);
console.log("Server is running on port 3000");

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "api-bas",
  multipleStatements: true,
});

app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/homepage.html");
});

// Skapar användare
app.post("/users", async function (req, res) {
  const fields = ["firstname", "lastname", "username", "password", "email"];

  console.log("user:", req.body);

  const missingFields = fields
    .filter((field) => !req.body[field])
    .join(", ");

  if (missingFields) {
    res.status(422).send(`Invalid data: ${missingFields} are required.`);
  } else if (isValidUserData(req.body)) {
    try {
      const result = await sqlUsers(req, res);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  } else {
    res.status(422).send(`Invalid data: ${fields} are required.`);
  }
});

// Loggar in 
app.post("/login", function (req, res) {
  console.log(req.body);
  
    if (!(req.body && req.body.username && req.body.password)) {
      res.sendStatus(400);
      return;
    }
  
    let sql = `SELECT * FROM users WHERE username='${req.body.username}'`;
  
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      let passwordHash = hash(req.body.password);
  
      if (result[0].password == passwordHash) {
        let information = {
          subObject: createSubObject(result)
        };
        let token = jwt.sign(information, "OMGvadskamanhaförhemligtlösenord-1234?");
        res.json(token);
      } else {
        res.sendStatus(401);
      }
    });
  });

const COLUMNS = ["id", "firstname", "lastname", "username", "password", "email"];

// Kan se alla användare om man är authorized
app.get("/users", function (req, res) {
  authorization(req);

  let sql = "SELECT * FROM users";
  let condition = createCondition(req.query);
  console.log(sql + condition);

  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

// Kan se specifika användare om man är authorized
app.get("/users/:id", function (req, res) {
  authorization(req);
  
  let sql = "SELECT * FROM users WHERE id=" + req.params.id;
  console.log(sql);

  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404);
    }
  });
});

// Ändra information hos användare (kan endast göras om man är authorized)
app.put("/users/:id", function (req, res) {
  authorization(req);

  if (!(req.body && req.body.lastname && req.body.username && req.body.email && req.body.password)) {
    res.sendStatus(400);
    return;
  }
  
  // Det nya lösenordet ska bli hashat om man ska uppdatera det
  const hashedPassword = hash(req.body.password);

  let sql = `UPDATE users 
        SET 
        lastname = '${req.body.lastname}', 
        username = '${req.body.username}', 
        email = '${req.body.email}', 
        password = '${hashedPassword}'
        WHERE id = ${req.params.id}`;

  con.query(sql, function (err, result, fields) {
    if (err) {
      throw err;
    } else {
      res.status(200).send('Dina ändringar är gjorda');
    } 
      
    
  });
});



//Funktioner
const createSubObject = (result) => ({
  sub: result[0].username,
  firstname: result[0].firstname,
  lastname: result[0].lastname,
  email: result[0].email
});

const createCondition = (query) => {
  let output = " WHERE ";
  for (let key in query) {
    if (COLUMNS.includes(key)) {
      output += `${key}="${query[key]}" OR `;
    }
  }
  return output.length === 7 ? "" : output.substring(0, output.length - 4);
};

const sqlUsers = async (req, res) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO users (firstname, lastname, username, password, email)
      VALUES (
        '${req.body.firstname}',
        '${req.body.lastname}',
        '${req.body.username}', 
        '${hash(req.body.password)}',
        '${req.body.email}');
      SELECT LAST_INSERT_ID();`;

    con.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const output = {
          id: result.insertId,
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          username: req.body.username,
          password: req.body.password,
          email: req.body.email,
        };
        resolve(output);
      }
    });
  });
};

const isValidUserData = (body) => {
  return body && body.firstname && body.lastname && body.username && body.password &&  body.email;

};

const hash = (data) => {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
};

const handleError = (err, res) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
};

const authorization = (req) => {
  let authorizationHeader = req.headers["authorization"];
  if (authorizationHeader === undefined) {
    res.sendStatus(400);
    return;
  }
  let token = authorizationHeader.slice(7);

  console.log(token);

  let decoded;
  try {

    decoded = jwt.verify(token, "OMGvadskamanhaförhemligtlösenord-1234?");

  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid authorization token");
    return;
  }
}

