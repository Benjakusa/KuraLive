import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();
export const useSubscription = () => useContext(SubscriptionContext);

export const PLANS = {
    free: {
        id: 'free',
        name: 'Free Trial',
        price: 0,
        currency: 'Ksh. ',
        maxAgents: 5,
        maxStations: 10,
        period: '',
        features: ['Up to 10 polling stations', '5 field agents', 'Real-time results dashboard', 'Basic analytics', 'Email support'],
    },
    medium: {
        id: 'medium',
        name: 'Professional',
        price: 4999,
        currency: 'Ksh. ',
        period: '/ month',
        maxAgents: Infinity,
        maxStations: Infinity,
        features: ['Unlimited stations', 'Unlimited field agents', 'Advanced analytics & exports', 'Photo proof verification', 'Priority support', 'Custom branding'],
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 11999,
        currency: 'Ksh. ',
        maxAgents: Infinity,
        maxStations: Infinity,
        period: '',
        features: ['Everything in Professional', 'Dedicated infrastructure', 'SLA guarantees', 'API access', 'White-label solution', 'On-premise deployment option', '24/7 dedicated support'],
    },
};

export const SubscriptionProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser?.role === 'manager') {
            fetchSubscription();
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const data = await api.getSubscription();
            setSubscription(data.data);
        } catch (err) {
            console.error('Error fetching subscription:', err);
        }
        setLoading(false);
    };

    const getDaysLeft = () => {
        if (!subscription?.trial_expires_at) return 0;
        const diff = new Date(subscription.trial_expires_at) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const isExpired = () => {
        if (!subscription) return false;
        if (subscription.status === 'active') return false;
        return getDaysLeft() === 0;
    };

    const isTrial = () => subscription?.status === 'trial';

    const currentPlan = () => PLANS[subscription?.plan || 'free'];

    const upgradePlan = async (planId, phoneNumber = null) => {
        const plan = PLANS[planId];
        if (!plan) throw new Error('Invalid plan');

        if (planId === 'free') {
            const data = await api.upgradePlan(planId, phoneNumber);
            setSubscription(data.data);
            return data.data;
        }

        if (!phoneNumber) {
            throw new Error('Phone number required for payment');
        }

        try {
            const stkResponse = await api.initiateSTKPush({
                phoneNumber,
                amount: plan.price,
                accountReference: `KuraLive-${planId}`,
                transactionDesc: `KuraLive ${plan.name} Package`,
                planId,
            });

            await fetchSubscription();

            return { ...stkResponse, planId, amount: plan.price };
        } catch (error) {
            console.error('Payment initiation failed:', error);
            throw error;
        }
    };

    const pollPaymentStatus = async (checkoutRequestID, maxAttempts = 30, intervalMs = 3000) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));

            await fetchSubscription();

            if (subscription?.payment_confirmed) {
                return {
                    confirmed: true,
                    mpesaReceipt: subscription.mpesa_receipt,
                    planId: subscription.pending_plan,
                };
            }

            try {
                const status = await api.checkSTKStatus(checkoutRequestID);
                if (status.ResultCode === 0) {
                    await fetchSubscription();
                    return {
                        confirmed: true,
                        mpesaReceipt: subscription?.mpesa_receipt || 'Processing...',
                        planId: subscription?.pending_plan,
                    };
                }
                if (status.ResultCode !== '1') {
                    return { confirmed: false, message: status.ResultDesc };
                }
            } catch (e) {}
        }

        return { confirmed: false, message: 'Payment confirmation timed out' };
    };

    const activatePlan = async () => {
        if (!subscription?.payment_confirmed) {
            throw new Error('Payment not confirmed yet');
        }

        const data = await api.activatePlan();
        setSubscription(data.data);
        return data.data;
    };

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            loading,
            getDaysLeft,
            isExpired,
            isTrial,
            currentPlan,
            upgradePlan,
            pollPaymentStatus,
            activatePlan,
            PLANS,
            refetch: fetchSubscription,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};
