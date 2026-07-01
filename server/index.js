import app from "../server/app.js";

const port = process.env.PORT || 5174;

app.listen(port, () => {
  console.log(`EduSG API running on http://127.0.0.1:${port}`);
});
