import { nanoid } from "nanoid";
import { PieChart } from "react-minimal-pie-chart";

export const newBudgetSection = {
  title: "",
  tag: { label: "", value: "#dbdbdb1f" },
  comment: "",
  amount: 0,
  locked: 0,
  sectionMode: "budget" as const,
};
export const BudgetHeaderOptions = ({ sections }) => {
  let noNullColor = [];
  noNullColor = sections?.length
    ? sections.map((section) => {
        if (!section.tag) {
          return { ...section, tag: { label: "gray", value: "gray" } };
        } else {
          return section;
        }
      })
    : [];

  let colorAmounts = noNullColor.reduce((acc, obj) => {
    let found = acc.find((x) => x.tag === obj.tag);
    if (found) {
      found.amount += obj.amount;
    } else {
      acc.push({ color: obj.tag.value, amount: obj.amount });
    }
    return acc;
  }, []);

  const colorAmountsFormatted = colorAmounts.map((color) => {
    let updatedAmount =
      color.amount > 1 || isNaN(color.amount)
        ? (color.amount = 0)
        : (color.amount = Math.abs(color.amount));
    return { ...color, value: updatedAmount, color: color.color ?? "gray" };
  });

  const calcTotal =
    sections &&
    sections.reduce((sum, { amount, locked }) => {
      return Number(sum) + (!!locked ? Number(locked) : Number(amount));
    }, 0);
  const displayTotal = () => {
    if (!Number.isFinite(calcTotal)) return "";
    const toDisplay = calcTotal;
    return toDisplay > 0
      ? "+" + toDisplay
      : toDisplay.toString().replace("-", "");
  };

  return (
    <>
      <div className="piechart mr-2">
        {sections?.length > 0 && <PieChart data={colorAmountsFormatted} />}
        <div className="chart_inside pageHeader-bg "></div>
      </div>
      <div className="text-lg font-medium">{displayTotal()}</div>
    </>
  );
};
