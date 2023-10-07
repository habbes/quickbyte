import { createResourceNotFoundError } from '../../error.js';
import { Plan } from '../../models.js';

const GB = 1024 * 1024 * 1024;

export interface PlanSeriviceConfig {
    paystackPlanCodes: {
        starterMonthly: string;
        starterAnnual: string;
    }
}

export class PlanService {
    private plans: Plan[];
    constructor(private config: PlanSeriviceConfig) {
        this.plans = [
            {
                name: 'starterMonthly',
                displayName: 'Quickbyte Starter - Monthly',
                price: 900,
                currency: 'KES',
                maxStorageSize: 500 * GB,
                maxTransferSize: 200 * GB,
                renewalRate: 'monthly',
                maxTransferValidity: 30,
                providerIds: {
                    paystack: config.paystackPlanCodes.starterMonthly
                }
            },
            {
                name: 'starterAnnual',
                displayName: 'Quickbyte Starter - Annual',
                price: 9000,
                currency: 'KES',
                maxStorageSize: 500 * GB,
                maxTransferSize: 200 * GB,
                renewalRate: 'annual',
                maxTransferValidity: 30,
                providerIds: {
                    paystack: config.paystackPlanCodes.starterAnnual
                }
            }
        ];
    }

    getAll(): Promise<Plan[]> {
        return Promise.resolve(this.plans)
    }

    getByName(name: string): Promise<Plan> {
        const plan = this.plans.find(p => p.name === name);
        if (!plan) {
            throw createResourceNotFoundError('The specified subscription plan does not exist.');
        }

        return Promise.resolve(plan);
    }
}

export type IPlanService = Pick<PlanService, 'getAll'|'getByName'>;
