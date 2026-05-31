import type { Cat, Vaccine } from "@/types/cat";

export type CatProfilePayload = Partial<
  Pick<
    Cat,
    | "name"
    | "ageMonths"
    | "sex"
    | "coat"
    | "weight"
    | "neutered"
    | "homeDate"
    | "deworm"
    | "notes"
  >
> & {
  vaccines?: Partial<Vaccine>[];
};

function cleanText(raw: unknown, max = 120): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : undefined;
}

function cleanNumber(raw: unknown): number | undefined {
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? raw
    : undefined;
}

function dateText(raw: unknown): string | undefined {
  const text = cleanText(raw, 20);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}

function vaccineText(raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) return "未填写/未知";
  const items = raw
    .slice(0, 8)
    .map((v) => {
      if (!v || typeof v !== "object") return undefined;
      const r = v as Record<string, unknown>;
      const name = cleanText(r.name, 40);
      const date = dateText(r.date);
      if (!name && !date) return undefined;
      if (name && date) return `${name}(${date})`;
      return name ?? `未命名疫苗(${date})`;
    })
    .filter(Boolean);
  return items.length > 0 ? items.join("、") : "未填写/未知";
}

export function catProfilePayload(cat: Cat | null | undefined): CatProfilePayload | undefined {
  if (!cat) return undefined;
  return {
    name: cat.name,
    ageMonths: cat.ageMonths,
    sex: cat.sex,
    coat: cat.coat,
    weight: cat.weight,
    neutered: cat.neutered,
    homeDate: cat.homeDate,
    vaccines: cat.vaccines.slice(0, 8).map((v) => ({
      name: v.name,
      date: v.date,
    })),
    deworm: cat.deworm,
    notes: cat.notes,
  };
}

export function catProfileContext(cat: unknown): string | null {
  if (!cat || typeof cat !== "object") return null;
  const c = cat as Record<string, unknown>;
  const bits: string[] = [];

  const name = cleanText(c.name, 40);
  const ageMonths = cleanNumber(c.ageMonths);
  const sex = cleanText(c.sex, 12);
  const coat = cleanText(c.coat, 12);
  const weight = cleanNumber(c.weight);
  const neutered = cleanText(c.neutered, 12);
  const homeDate = dateText(c.homeDate);
  const deworm = dateText(c.deworm);
  const notes = cleanText(c.notes, 260);

  if (name) bits.push(`名字「${name}」`);
  if (ageMonths !== undefined) bits.push(`约 ${ageMonths} 月龄`);
  if (sex) bits.push(`性别${sex}`);
  if (coat) bits.push(`毛发${coat}`);
  if (weight !== undefined) bits.push(`体重 ${Number(weight.toFixed(2))} kg`);
  if (neutered) bits.push(`绝育情况:${neutered}`);
  if (homeDate) bits.push(`到家日期 ${homeDate}`);
  bits.push(`疫苗记录:${vaccineText(c.vaccines)}`);
  bits.push(`最近驱虫日期 ${deworm ?? "未填写/未知"}`);
  if (notes) bits.push(`备注:${notes}`);

  if (bits.length === 0) return null;
  const body = bits.join("、");
  const end = /[。！？.!?]$/.test(body) ? "" : "。";
  return `(供参考的用户猫咪档案,涉及月龄、体重、疫苗/驱虫、绝育和既往备注时要用于风险判断:${body}${end})`;
}
