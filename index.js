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

app.post("/users", async function (req, res) {
  const fields = ["firstname", "lastname", "username", "password", "email"];

  if (!req.body.username) {
    res.status(400).send("username required!");
    return;
  }
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

const COLUMNS = ["id", "firstname", "lastname", "username", "password", "email"];

app.get("/users", function (req, res) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    res.sendStatus(400);
    return;
  }
  let token = authHeader.slice(7);

  console.log(token);

  let decoded;
  try {
    decoded = jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return;
  }

  console.log(decoded);
  console.log(`Tjena ${decoded.firstname}! Din mailadress är ${decoded.email}.`);

  let sql = "SELECT * FROM users";
  let condition = createCondition(req.query);
  console.log(sql + condition);

  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

app.get("/users/:id", function (req, res) {
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

app.put("/users/:id", function (req, res) {
  if (!(req.body && req.body.firstname && req.body.email && req.body.password)) {
    res.sendStatus(400);
    return;
  }
  let sql = `UPDATE users 
        SET firstname = '${req.body.firstname}', 
        lastname = '${req.body.lastname}', 
        username = '${req.body.username}', 
        email = '${req.body.email}', 
        password = '${req.body.password}'
        WHERE id = ${req.params.id}`;

  con.query(sql, function (err, result, fields) {
    if (err) {
      throw err;
    } else {
      res.status(200).send('Allt funkar som det ska');
    }
  });
});

app.post("/login", function (req, res) {
  if (!(req.body && req.body.username && req.body.password)) {
    res.sendStatus(400);
    return;
  }

  let sql = `SELECT * FROM users WHERE username='${req.body.username}'`;

  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    if (result.length == 0) {
      res.sendStatus(401);
      return;
    }

    let passwordHash = hash(req.body.password);

    if (result[0].password == passwordHash) {
      res.send({
        subObject: createSubObject(result)
      });

      let payload = {
        subObject: createSubObject(result)
      };
      let token = jwt.sign(payload, "OMGvadskamanhaförhemligtlösenord-1234?");
      res.json(token);

    } else {
      res.sendStatus(401);
    }
  });
});

// Functions

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


// const result = await con.query(sql);
// const output = {
//   id: result[0].insertId,
//   firstname: req.body.firstname,
//   lastname: req.body.lastname,
//   username: req.body.username,
//   password: req.body.password,
//   email: req.body.email,
// };

// res.json(output);

