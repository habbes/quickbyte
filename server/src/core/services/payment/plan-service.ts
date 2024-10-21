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
            // LEGACY PLANS, do not delete
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
                },
                allowPurchase: false,
                allowRenew: false,
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
                },
                allowPurchase: false,
                allowRenew: false
            },
            {
                name: 'freeTrial',
                displayName: 'Quickbyte Free Trial',
                price: 0,
                currency: 'KES',
                maxStorageSize: 500 * GB,
                maxTransferSize: 200 * GB,
                renewalRate: 'monthly',
                maxTransferValidity: 15,
                providerIds: {
                },
                allowPurchase: false,
                allowRenew: false
            },
            // NEW PLANS
            {
                name: 'freeTier',
                displayName: 'Free',
                price: 0,
                currency: 'USD',
                maxStorageSize: 3 * GB,
                maxTransferSize: 3 * GB,
                renewalRate: 'monthly',
                providerIds: {},
                allowPurchase: true,
                allowRenew: true
            },
            // EARLY BIRD
            // We plan to retire this once new plans are rolled out
            {
                name: 'earlyBirdMonthly',
                displayName: 'Early Birrd Monthly',
                price: 900,
                currency: 'KES',
                maxTransferSize: 200 * GB,
                maxStorageSize: 500 * GB,
                renewalRate: 'monthly',
                providerIds: {},
                allowPurchase: true,
                allowRenew: true
            },
            {
                name: 'earlyBirdAnnual',
                displayName: 'Early Bird Annual',
                price: 9000,
                currency: 'KES',
                maxTransferSize: 200 * GB,
                maxStorageSize: 500 * GB,
                renewalRate: 'annual',
                providerIds: {},
                allowPurchase: true,
                allowRenew: true
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
