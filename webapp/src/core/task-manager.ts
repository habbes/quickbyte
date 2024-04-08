import { ref, reactive, type Ref, readonly } from "vue";
import type { Transfer } from "@quickbyte/common";


export class TaskManager {
    private tasks: Ref<Task[]>;
    private nextId = 1;

    constructor() {
        this.tasks = ref([]);
        
    }

    createTask(task: Omit<Task, '_id'>) {
        const reactiveTask = reactive({ ...task, _id: this.generateId() });
        this.tasks.value.push(reactiveTask);
        return reactiveTask;
    }

    removeTask(id: string) {
        this.tasks.value = this.tasks.value.filter(t => t._id !== id);
    }

    generateId(): string {
        return `${this.nextId++}`;
    }

    getTasks() {
        return readonly(this.tasks);
    }
}

export interface BaseTask {
    _id: string;
    description: string;
    status: TaskStatus;
    progress?: number;
    error?: string;
}

export type TaskStatus = 'pending'|'progress'|'complete'|'error';

export interface TransferTask extends BaseTask {
    type: 'transfer',
    transfer?: Transfer
}

export type Task = TransferTask;