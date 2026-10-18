require("dotenv").config({
  path: require("node:path").join(__dirname, ".env"),
  quiet: true,
});
const { createApp } = require("./app");

const port = process.env.PORT || 5000;
createApp().listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error(`Could not start server: ${error.code || "listen failed"}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Server live on port ${port}`);
});
