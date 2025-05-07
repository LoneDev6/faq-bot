const express = require('express');
const app = express();
require('dotenv').config()

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json("So what? You guessed the port, and now? :)");
})

const PORT = process.env.WEB_PORT || 3000;
app.listen(PORT, () => console.log(`Server online on port: ${PORT}`));