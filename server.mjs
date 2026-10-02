import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "256kb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "expenses_ai.html"));
});

app.post("/api/analyze", async (req, res) => {
  try {
    const transactions = Array.isArray(req.body?.transactions)
      ? req.body.transactions
      : [];

    if (!transactions.length) {
      return res.status(400).json({
        error: "Нет операций для анализа."
      });
    }

    const safeTransactions = transactions.slice(-500).map((x) => ({
      type: x?.type === "income" ? "income" : "expense",
      amount: Number(x?.amount) || 0,
      category: String(x?.category || "Другое").slice(0, 100),
      note: String(x?.note || "").slice(0, 200),
      date: String(x?.date || "").slice(0, 50)
    }));

    const response = await client.responses.create({
      model: MODEL,
      instructions: `Ты финансовый помощник.

Анализируй личные расходы спокойно и практично.
Не выдумывай данные. Используй только переданные операции.

Сначала назови 2–4 заметные закономерности.
Затем укажи категории, где потенциально можно экономить.
Дай конкретные идеи экономии.
Составь простой план на 30 дней.
Если данных достаточно, осторожно оцени возможную экономию диапазоном.

Не стыди пользователя.
Отвечай на русском языке, короткими понятными блоками.`,
      input: JSON.stringify(safeTransactions)
    });

    res.json({
      analysis: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Ошибка при обращении к ИИ. Проверь настройки OpenAI в Render."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Expenses AI server started on port ${PORT}`);
});
