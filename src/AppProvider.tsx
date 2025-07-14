import React, { createContext, useContext, useReducer, useEffect } from "react";
import axios from "axios";
import TaskList from "./domain/TaskList";
import Task from "./domain/Task";

interface AppState {
  taskLists: TaskList[];
  tasks: { [taskListId: string]: Task[] };
}

type Action =
  | { type: "FETCH_TASKLISTS"; payload: TaskList[] }
  | { type: "GET_TASKLIST"; payload: TaskList }
  | { type: "CREATE_TASKLIST"; payload: TaskList }
  | { type: "UPDATE_TASKLIST"; payload: TaskList }
  | { type: "DELETE_TASKLIST"; payload: string }
  | { type: "FETCH_TASKS"; payload: { taskListId: string; tasks: Task[] } }
  | { type: "CREATE_TASK"; payload: { taskListId: string; task: Task } }
  | { type: "GET_TASK"; payload: { taskListId: string; task: Task } }
  | {
      type: "UPDATE_TASK";
      payload: { taskListId: string; taskId: string; task: Task };
    }
  | { type: "DELETE_TASK"; payload: { taskListId: string; taskId: string } };

// Action types
const FETCH_TASKLISTS = "FETCH_TASKLISTS";
const GET_TASKLIST = "GET_TASKLIST";
const CREATE_TASKLIST = "CREATE_TASKLIST";
const UPDATE_TASKLIST = "UPDATE_TASKLIST";
const DELETE_TASKLIST = "DELETE_TASKLIST";
const FETCH_TASKS = "FETCH_TASKS";
const CREATE_TASK = "CREATE_TASK";
const GET_TASK = "GET_TASK";
const UPDATE_TASK = "UPDATE_TASK";
const DELETE_TASK = "DELETE_TASK";

// API Base URL - Fixed for Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tasks-backend-wium.onrender.com';

console.log('API_BASE_URL:', API_BASE_URL);
console.log('Full URL:', `${API_BASE_URL}/api/task-lists`);
console.log(import.meta.env.VITE_API_URL);

// Reducer
const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case FETCH_TASKLISTS:
      return { ...state, taskLists: action.payload };
    case GET_TASKLIST:
      return {
        ...state,
        taskLists: state.taskLists.some((wl) => wl.id === action.payload.id)
          ? state.taskLists.map((wl) =>
              wl.id === action.payload.id ? action.payload : wl
            )
          : [...state.taskLists, action.payload],
      };
    case CREATE_TASKLIST:
      return { ...state, taskLists: [...state.taskLists, action.payload] };
    case UPDATE_TASKLIST:
      return {
        ...state,
        taskLists: state.taskLists.map((wl) =>
          wl.id === action.payload.id ? action.payload : wl
        ),
      };
    case DELETE_TASKLIST:
      return {
        ...state,
        taskLists: state.taskLists.filter((wl) => wl.id !== action.payload),
      };
    case FETCH_TASKS:
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.payload.taskListId]: action.payload.tasks,
        },
      };
    case CREATE_TASK:
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.payload.taskListId]: [
            ...(state.tasks[action.payload.taskListId] || []),
            action.payload.task,
          ],
        },
      };
    case GET_TASK: {
      const existingTasks = state.tasks[action.payload.taskListId] || [];
      const taskExists = existingTasks.some(
        (task) => task.id === action.payload.task.id
      );
      const updatedTasks = taskExists
        ? existingTasks.map((task) =>
            task.id === action.payload.task.id ? action.payload.task : task
          )
        : [...existingTasks, action.payload.task];
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.payload.taskListId]: updatedTasks,
        },
      };
    }
    case UPDATE_TASK:
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.payload.taskListId]: state.tasks[
            action.payload.taskListId
          ].map((task) =>
            task.id === action.payload.taskId ? action.payload.task : task
          ),
        },
      };
    case DELETE_TASK:
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.payload.taskListId]: state.tasks[
            action.payload.taskListId
          ].filter((task) => task.id !== action.payload.taskId),
        },
      };
    default:
      return state;
  }
};

// Initial state
const initialState: AppState = {
  taskLists: [],
  tasks: {},
};

// Context
interface AppContextType {
  state: AppState;
  api: {
    fetchTaskLists: () => Promise<void>;
    getTaskList: (id: string) => Promise<void>;
    createTaskList: (taskList: Omit<TaskList, "id">) => Promise<void>;
    updateTaskList: (id: string, taskList: TaskList) => Promise<void>;
    deleteTaskList: (id: string) => Promise<void>;
    fetchTasks: (taskListId: string) => Promise<void>;
    createTask: (
      taskListId: string,
      task: Omit<Task, "id" | "taskListId">
    ) => Promise<void>;
    getTask: (taskListId: string, taskId: string) => Promise<void>;
    updateTask: (
      taskListId: string,
      taskId: string,
      task: Task
    ) => Promise<void>;
    deleteTask: (taskListId: string, taskId: string) => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const jsonHeaders = {
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // Include credentials for CORS
    timeout: 10000, // 10-second timeout to prevent long requests
  };

  // API calls
  const api: AppContextType["api"] = {
    fetchTaskLists: async () => {
      try {
        console.log('Fetching task lists from:', `${API_BASE_URL}/api/task-lists`);
        const response = await axios.get<TaskList[]>(
          `${API_BASE_URL}/api/task-lists`,
          jsonHeaders
        );
        console.log('Task lists response:', response.data);
        dispatch({ type: FETCH_TASKLISTS, payload: response.data });
      } catch (error: any) {
        console.error('Error fetching task lists:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        throw error;
      }
    },
    getTaskList: async (id: string) => {
      try {
        const response = await axios.get<TaskList>(
          `${API_BASE_URL}/api/task-lists/${id}`,
          jsonHeaders
        );
        dispatch({ type: GET_TASKLIST, payload: response.data });
      } catch (error: any) {
        console.error('Error getting task list:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    createTaskList: async (taskList) => {
      try {
        const response = await axios.post<TaskList>(
          `${API_BASE_URL}/api/task-lists`,
          taskList,
          jsonHeaders
        );
        dispatch({ type: CREATE_TASKLIST, payload: response.data });
      } catch (error: any) {
        console.error('Error creating task list:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    getTask: async (taskListId: string, taskId: string) => {
      try {
        const response = await axios.get<Task>(
          `${API_BASE_URL}/api/task-lists/${taskListId}/tasks/${taskId}`,
          jsonHeaders
        );
        dispatch({
          type: GET_TASK,
          payload: { taskListId, task: response.data },
        });
      } catch (error: any) {
        console.error('Error getting task:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    updateTaskList: async (id, taskList) => {
      try {
        const response = await axios.put<TaskList>(
          `${API_BASE_URL}/api/task-lists/${id}`,
          taskList,
          jsonHeaders
        );
        dispatch({ type: UPDATE_TASKLIST, payload: response.data });
      } catch (error: any) {
        console.error('Error updating task list:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    deleteTaskList: async (id) => {
      try {
        await axios.delete(`${API_BASE_URL}/api/task-lists/${id}`, jsonHeaders);
        dispatch({ type: DELETE_TASKLIST, payload: id });
      } catch (error: any) {
        console.error('Error deleting task list:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    fetchTasks: async (taskListId) => {
      try {
        const response = await axios.get<Task[]>(
          `${API_BASE_URL}/api/task-lists/${taskListId}/tasks`,
          jsonHeaders
        );
        dispatch({
          type: FETCH_TASKS,
          payload: { taskListId, tasks: response.data },
        });
      } catch (error: any) {
        console.error('Error fetching tasks:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    createTask: async (taskListId, task) => {
      try {
        const response = await axios.post<Task>(
          `${API_BASE_URL}/api/task-lists/${taskListId}/tasks`,
          task,
          jsonHeaders
        );
        dispatch({
          type: CREATE_TASK,
          payload: { taskListId, task: response.data },
        });
      } catch (error: any) {
        console.error('Error creating task:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    updateTask: async (taskListId, taskId, task) => {
      try {
        const response = await axios.put<Task>(
          `${API_BASE_URL}/api/task-lists/${taskListId}/tasks/${taskId}`,
          task,
          jsonHeaders
        );
        dispatch({
          type: UPDATE_TASK,
          payload: { taskListId, taskId, task: response.data },
        });
      } catch (error: any) {
        console.error('Error updating task:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
    deleteTask: async (taskListId, taskId) => {
      try {
        await axios.delete(
          `${API_BASE_URL}/api/task-lists/${taskListId}/tasks/${taskId}`,
          jsonHeaders
        );
        dispatch({ type: DELETE_TASK, payload: { taskListId, taskId } });
      } catch (error: any) {
        console.error('Error deleting task:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
    },
  };

  useEffect(() => {
    api.fetchTaskLists();
  }, []);

  return (
    <AppContext.Provider value={{ state, api }}>{children}</AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};