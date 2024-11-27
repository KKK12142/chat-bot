import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default async function createChatCompletion(
  question,
  message_history = []
) {
  if (message_history.length == 0) {
    message_history.push({
      role: "system",
      content: ` 학생들을 대상으로 상담을 하는 전문 상담사 역할 수행하며 질문을 통해 대화를 유도할 것.`,
    });
  }

  message_history.push({ role: "user", content: question });

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: message_history,
    tools: [
      {
        type: "function",
        function: {
          name: "create_response",
          description: "상담사의 응답을 생성",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: `You are a Professional Counselor, skilled in providing guidance and support to students. You will engage in friendly conversations, offering appropriate advice based on the situation. You will listen to the student's conversation, inquire about their emotions, and continue the dialogue in a way that helps stabilize their psychological state. Here is how you will proceed: 

**Step 1: Establish Rapport:**
 Begin by introducing yourself in a friendly manner, making the student feel comfortable and open to sharing. 

**Step 2: Active Listening:**
 Pay close attention to what the student is saying, showing empathy and understanding. Ask open-ended questions to encourage them to express their feelings. 

**Step 3: Emotional Inquiry:**
 Gently inquire about the student's emotions, asking how they feel about certain situations to better understand their psychological state. 

**Step 4: Provide Supportive Advice:**
 Based on the student's responses, offer advice that is supportive and relevant to their situation, ensuring it is practical and empathetic. 

**Step 5: Encourage Positive Actions:**
 Suggest actions or strategies that can help the student manage their emotions and improve their situation. 

Now, proceed to execute the following task: 학생들을 대상으로 상담을 하는 전문 상담사 역할 수행하며 질문을 통해 대화를 유도할 것. 

Take a deep breath and lets work this out in a step by step way to be sure we have the right answer."
`,
              },
            },
            required: ["message"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "create_response" } },
  });

  const toolCall = chatCompletion.choices[0].message.tool_calls?.[0];
  const response = toolCall ? JSON.parse(toolCall.function.arguments) : null;

  const assistantResponse = response?.emoji
    ? `${response.message} ${response.emoji}`
    : response?.message;

  message_history.push({
    role: "assistant",
    content: assistantResponse,
  });

  return message_history;
}

export async function analyzeSentiment(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `너는 대화 내용의 감정을 분석하는 전문가야. 
          대화의 부정적인 감정 수준을 0(매우 긍정적)부터 100(매우 부정적)까지의 숫자로만 응답해줘.
          특히 우울, 불안, 자살 위험이 있는 대화는 90점 이상을 부여해줘.
          숫자만 응답하고 다른 설명은 하지마.`,
        },
        {
          role: "user",
          content: messages,
        },
      ],
      max_tokens: 5,
      temperature: 0.3,
    });

    const score = parseInt(response.choices[0].message.content.trim());
    return isNaN(score) ? 50 : score;
  } catch (error) {
    console.error("감정 분석 중 오류 발생:", error);
    return 50; // 오류 발생시 중간값 반환
  }
}

export async function generateMission(chatHistory) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "대화 내용을 분석하여 사용자에게 도움이 될 수 있는 실천 가능한 미션을 생성해주세요.",
        },
        {
          role: "user",
          content: chatHistory,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_mission",
            description: "사용자를 위한 맞춤형 미션 생성",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "미션 제목 (30자 이내)",
                },
                description: {
                  type: "string",
                  description: "구체적인 미션 설명 (100자 이내)",
                },
                difficulty: {
                  type: "integer",
                  description: "미션 난이도 (1-5)",
                  minimum: 1,
                  maximum: 5,
                },
              },
              required: ["title", "description", "difficulty"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_mission" } },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    return toolCall ? JSON.parse(toolCall.function.arguments) : null;
  } catch (error) {
    console.error("미션 생성 중 오류 발생:", error);
    return null;
  }
}
