import api from '../lib/api';

export const initiateSTKPush = async (payload) => {
    return api.initiateSTKPush(payload);
};

export const checkSTKStatus = async (checkoutRequestID) => {
    return api.checkSTKStatus(checkoutRequestID);
};

export default { initiateSTKPush, checkSTKStatus };
