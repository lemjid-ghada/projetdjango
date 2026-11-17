import { apiClient, asArray } from './client';
import type { ChatMessage, ChatSession } from '../types';

export interface StudentCommandResult {
  action:
    | 'show_courses'
    | 'show_quizzes'
    | 'open_course'
    | 'open_quiz'
    | 'next_quiz'
    | 'summarize_course'
    | 'unknown';
  targetId?: number;
  title?: string;
  summary?: string;
  message: string;
}

export interface StudyPlanTask {
  taskId: string;
  type: 'lesson' | 'quiz';
  title: string;
  courseId: number;
  courseTitle: string;
  durationMinutes: number;
  dueAt?: string | null;
  minutes: number;
  note: string;
}

export interface StudyPlanDay {
  date: string;
  totalMinutes: number;
  tasks: StudyPlanTask[];
}

export interface StudyPlan {
  startDate: string;
  minutesPerDay: number;
  days: StudyPlanDay[];
}

export const chatbotApi = {
  async runStudentCommand(command: string): Promise<StudentCommandResult> {
    const { data } = await apiClient.post<StudentCommandResult>(
      '/chat/command/',
      { command },
    );
    return data;
  },

  async generateStudyPlan(minutesPerDay: number): Promise<StudyPlan> {
    const { data } = await apiClient.post<StudyPlan>('/chat/planner/', {
      minutesPerDay,
    });
    return data;
  },

  async getSessions(): Promise<ChatSession[]> {
    const { data } = await apiClient.get<ChatSession[] | { results: ChatSession[] }>(
      '/chatbot/sessions/',
    );
    return asArray(data);
  },

  async createSession(courseId?: number): Promise<ChatSession> {
    const { data } = await apiClient.post<ChatSession>('/chatbot/sessions/', {
      ...(courseId ? { course_id: courseId } : {}),
    });
    return data;
  },

  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    const { data } = await apiClient.get<ChatMessage[] | { results: ChatMessage[] }>(
      `/chatbot/sessions/${sessionId}/messages/`,
    );
    return asArray(data);
  },

  async sendMessage(
    sessionId: number,
    content: string,
    courseId?: number,
  ): Promise<{
    session: ChatSession;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    quiz_draft?: import('./quizzesApi').QuizDraft;
    mock?: boolean;
  }> {
    const { data } = await apiClient.post(
      '/chatbot/message/',
      { session_id: sessionId, message: content, ...(courseId ? { course_id: courseId } : {}) },
    );
    return data;
  },

  async clearSession(sessionId: number): Promise<void> {
    await apiClient.delete(`/chatbot/sessions/${sessionId}/`);
  },
};
