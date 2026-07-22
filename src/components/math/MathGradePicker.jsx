import GradePicker from "../shared/GradePicker.jsx";

const MATH_GRADES = ["P1", "P2", "P3", "P4", "P5", "P6"];

export function MathHeaderGrades({ grade, setGrade, className = "" }) {
  return (
    <div className={className}>
      <GradePicker
        grades={MATH_GRADES}
        value={grade}
        onChange={setGrade}
        activeClassName="bg-teal text-white"
      />
    </div>
  );
}
