import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
// If you need to redirect after deactivation, import useNavigate
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import paypal_logo_pp from '../assets/paypal-logo-pp.png'

const Settings = () => {
    const navigate = useNavigate(); // Optional, if you want to redirect upon deletion


    // --------------------------------------
    // 1. State: User info + System info
    // --------------------------------------
    const [userInfo, setUserInfo] = useState({
        id: null,       // compare to owner_id
        first_name: '',
        last_name: '',
        email: '',
        role: '',       // 'admin' or 'user'
    });

    const [systemInfo, setSystemInfo] = useState({
        id: null,
        owner_id: null,
        name: '',
        paypal_client_id: '',
        paypal_secret: ''
    });

    // --------------------------------------
    // 2. Global success/error messages
    // --------------------------------------
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // --------------------------------------
    // 3. Password modal states
    // --------------------------------------
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Modal-specific messages
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // --------------------------------------
    // 4. Updating user info states
    // --------------------------------------
    const [isUpdatingUserInfo, setIsUpdatingUserInfo] = useState(false);

    // --------------------------------------
    // 5. Deactivate modal states
    // --------------------------------------
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [deactivateStep, setDeactivateStep] = useState(1);
    const [deactivateType, setDeactivateType] = useState('');  // "system" or "account"
    const [paypalClientId, setPaypalClientId] = useState('');
    const [paypalSecret, setPaypalSecret] = useState('');
    const [isAddPayPalModalOpen, setIsAddPayPalModalOpen] = useState(false);
    const [isEditPayPalModalOpen, setIsEditPayPalModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showPayPalClientId, setShowPayPalClientId] = useState(false);
    const [showPayPalSecret, setShowPayPalSecret] = useState(false);
    const [isSaving, setIsSaving] = useState(false);



    // ------------------------------------------------------------------------
    // useEffect: Fetch user info & system info on mount
    // ------------------------------------------------------------------------
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await apiService.getUser();
                setUserInfo({
                    id: response.data.id,
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    email: response.data.email,
                    role: response.data.role,
                });
            } catch (err) {
                setErrorMessage('Failed to load user information.');
                setTimeout(() => setErrorMessage(''), 3000);
            }
        };

        const fetchSystemInfo = async () => {
            try {
                const res = await apiService.getSystemInfo();  // your backend endpoint
                setSystemInfo({
                    id: res.data.id,
                    owner_id: res.data.owner_id,
                    name: res.data.name,
                    paypal_client_id: res.data.paypal_client_id,
                    paypal_secret: res.data.paypal_secret
                });
                setIsConnected(!!(res.data.paypal_client_id && res.data.paypal_secret));

            } catch (err) {
                console.error('Failed to load system info', err);
            }
        };

        fetchUserInfo();
        fetchSystemInfo();
    }, []);

    // --------------------------------------
    // Update personal info
    // --------------------------------------
    const handleUserInfoChange = (e) => {
        const { name, value } = e.target;
        setUserInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdateUserInfo = async () => {
        setSuccessMessage('');
        setErrorMessage('');
        setIsUpdatingUserInfo(true);

        try {
            const response = await apiService.updateUserInfo(userInfo);
            setSuccessMessage(response.data.success || 'Profile updated successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setErrorMessage(err.response?.data?.error || 'Failed to update user information.');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setIsUpdatingUserInfo(false);
        }
    };

    // --------------------------------------
    // Password Modal
    // --------------------------------------
    const openPasswordModal = () => {
        setIsModalOpen(true);
        setModalError('');
        setModalSuccess('');
    };

    const closePasswordModal = () => {
        setIsModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setModalError('');
        setModalSuccess('');
    };

    // --------------------------------------
    // Update Password
    // --------------------------------------
    const handleUpdatePassword = async () => {
        setModalError('');
        setModalSuccess('');
        setIsUpdatingPassword(true);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setModalError('All fields are required.');
            setIsUpdatingPassword(false);
            return;
        }
        if (newPassword.length < 6) {
            setModalError('New password must be at least 6 characters.');
            setIsUpdatingPassword(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setModalError('New password and confirm password do not match.');
            setIsUpdatingPassword(false);
            return;
        }

        try {
            const response = await apiService.updateUserPassword(
                currentPassword,
                newPassword,
                confirmPassword
            );
            setModalSuccess(response.data.success || 'Password updated successfully.');
            setTimeout(() => {
                closePasswordModal();
            }, 2000);
        } catch (err) {
            setModalError(err.response?.data?.error || 'Failed to update password.');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    // --------------------------------------
    // Request Temp Password
    // --------------------------------------
    const handleRequestTempPassword = async () => {
        setModalError('');
        setModalSuccess('');

        try {
            const response = await apiService.forgotPassword(userInfo.email);
            setModalSuccess(response.data.success || 'Temporary password requested.');
            setTimeout(() => {
                closePasswordModal();
            }, 2000);
        } catch (err) {
            setModalError(err.response?.data?.error || 'Failed to request temporary password.');
        }
    };

    // --------------------------------------
    // PayPal Integration
    // --------------------------------------
    const handleOpenAddPayPalModal = () => {
        setIsAddPayPalModalOpen(true);
        setPaypalClientId(''); // Clear fields for adding
        setPaypalSecret('');
    };

    const handleOpenEditPayPalModal = () => {
        setIsEditPayPalModalOpen(true);
        setPaypalClientId(systemInfo.paypal_client_id || ''); // Pre-fill fields for editing
        setPaypalSecret(systemInfo.paypal_secret || '');
    };

    const handleClosePayPalModal = () => {
        setIsAddPayPalModalOpen(false);
        setIsEditPayPalModalOpen(false);
        setPaypalClientId(''); // Reset fields on close
        setPaypalSecret('');
    };


    const handleSavePayPalCredentials = async () => {
        // Clear any existing messages
        setSuccessMessage('');
        setErrorMessage('');

        // Frontend validation
        if (!paypalClientId || paypalClientId.length < 40) {
            setErrorMessage('Invalid PayPal Client ID. It should be at least 40 characters long.');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }
        if (!paypalSecret || paypalSecret.length < 40) {
            setErrorMessage('Invalid PayPal Secret. It should be at least 40 characters long.');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }

        setIsSaving(true); // Start saving state
        try {
            const data = {
                system_id: systemInfo.id,
                paypal_client_id: paypalClientId,
                paypal_secret: paypalSecret,
            };

            // Send credentials to the backend
            await apiService.updatePaypalCredentials(data);

            setSuccessMessage('PayPal credentials updated successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            handleClosePayPalModal(); // Close modal after saving
            setIsConnected(true); // Update connection status
        } catch (err) {
            console.error('Failed to update PayPal credentials:', err);
            setErrorMessage('Failed to update PayPal credentials.');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setIsSaving(false); // End saving state
        }
    };



    // --------------------------------------
    // Deactivate System or Account
    // --------------------------------------
    const openDeactivateModal = (type) => {
        setDeactivateType(type); // 'system' or 'account'
        setDeactivateStep(1);
        setIsDeactivateModalOpen(true);
    };

    const closeDeactivateModal = () => {
        setIsDeactivateModalOpen(false);
        setDeactivateStep(1);
        setDeactivateType('');
    };

    const handleDeactivateConfirm = async () => {
        if (deactivateStep === 1) {
            setDeactivateStep(2);
        } else {
            // Step 2 => final
            try {
                if (deactivateType === 'system') {
                    // Delete system
                    await apiService.deleteSystem(systemInfo.id, userInfo.id);
                    // If we get here, no exception was thrown,
                    // or we handle 401/404 below
                    navigate('/goodbye', { state: { type: 'system' } });
                } else {
                    // Delete user
                    await apiService.deleteUserSelf(userInfo.id);
                    // If we get here, no exception was thrown,
                    // or we handle 401/404 below
                    navigate('/goodbye', { state: { type: 'account' } });
                }
                return; // Important: stop further code
            } catch (err) {
                // Grab status
                const status = err.response?.status;

                // If 401 or 404, treat as success (already gone)
                if (status === 401 || status === 404) {
                    console.log(`${deactivateType} is already gone. Interpreting as success.`);
                    navigate('/goodbye', { state: { type: deactivateType } });
                    return;
                }

                // Otherwise, real error
                setErrorMessage(
                    err.response?.data?.error ||
                    (deactivateType === 'system'
                        ? 'Failed to delete system.'
                        : 'Failed to deactivate account.')
                );
            }
        }
    };




    const getDeactivateTitle = () => {
        return deactivateType === 'system' ? 'Deactivate System' : 'Deactivate Account';
    };

    const getDeactivateMessage = () => {
        if (deactivateType === 'system') {
            if (deactivateStep === 1) {
                return 'Warning: This will delete the system and all of its users, including admins.';
            }
            return 'Are you absolutely sure? This action cannot be undone.';
        } else {
            // account
            if (deactivateStep === 1) {
                return 'Are you sure you want to deactivate your account? This will remove your access.';
            }
            return 'Final confirmation: This action cannot be undone.';
        }
    };

    // Decide if we show "Deactivate System" or "Deactivate Account"
    // If userInfo.id === systemInfo.owner_id => "system", else "account"
    const renderDeactivateButton = () => {
        if (!systemInfo.id || !userInfo.id) {
            return null; // or spinner
        }

        if (userInfo.id === systemInfo.owner_id) {
            return (
                <button
                    onClick={() => openDeactivateModal('system')}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-md"
                >
                    Deactivate System
                </button>
            );
        } else {
            return (
                <button
                    onClick={() => openDeactivateModal('account')}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-md"
                >
                    Deactivate Account
                </button>
            );
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg mt-8">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            {/* GLOBAL SUCCESS / ERROR (for user info) */}
            {successMessage && (
                <div className="mb-4 rounded-md bg-green-50 p-4">
                    <p className="text-green-600">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                    <p className="text-red-600">{errorMessage}</p>
                </div>
            )}

            {/* 1) Personal Information */}
            <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label
                                htmlFor="first_name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                First Name
                            </label>
                            <input
                                type="text"
                                name="first_name"
                                id="first_name"
                                value={userInfo.first_name}
                                onChange={handleUserInfoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                           focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="last_name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Last Name
                            </label>
                            <input
                                type="text"
                                name="last_name"
                                id="last_name"
                                value={userInfo.last_name}
                                onChange={handleUserInfoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                           focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={userInfo.email}
                            onChange={handleUserInfoChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <button
                    onClick={handleUpdateUserInfo}
                    disabled={isUpdatingUserInfo}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 
                     text-white font-medium px-5 py-2 rounded-md mt-4 
                     disabled:opacity-50"
                >
                    {isUpdatingUserInfo ? (
                        <>
                            <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24" />
                            Updating...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </button>
            </section>

            {/* 2) Password Management */}
            <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Password Management</h3>
                <button
                    onClick={openPasswordModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md"
                >
                    Update Password
                </button>
            </section>

            {userInfo.id === systemInfo.owner_id ? (
                <div className='mb-8'>
                    <h3 className="text-xl font-semibold mb-4">Payment Integration</h3>
                    {!isConnected ? (
                        <button
                            onClick={handleOpenAddPayPalModal}
                            className="flex items-center bg-gray-200 hover:bg-gray-300 
                    text-black font-medium px-5 py-2 rounded-full shadow-md"
                        >
                            <img
                                src={paypal_logo_pp}
                                alt="PayPal Logo"
                                className="w-10 h-auto object-contain"
                            />
                            <span>Connect with PayPal</span>
                        </button>
                    ) : (
                        <div className="p-4 bg-green-100 border border-green-300 w-1/2 rounded-lg shadow-md">
                            <div className="flex items-center mb-4">
                                <img
                                    src={paypal_logo_pp}
                                    alt="PayPal Logo"
                                    className="w-14 h-auto object-contain"
                                />
                                <div>
                                    <h4 className="text-lg font-medium text-green-800">PayPal Account Connected</h4>
                                    <p className="text-sm text-gray-600">You can now use PayPal for payment links.</p>

                                </div>
                            </div>
                            <button
                                onClick={handleOpenEditPayPalModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded shadow-md transition-all"
                            >
                                Edit PayPal Credentials
                            </button>
                        </div>

                    )}
                </div>
            ) : (
                // Non-Owner View
                // Non-Owner View
                <section className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Payment Integration</h3>
                    <div
                        className={`flex items-center p-4 rounded ${isConnected
                            ? 'bg-green-100 border border-green-300 text-green-700'
                            : 'bg-red-100 border border-red-300 text-red-700'
                            }`}
                    >
                        <div className="mr-3">
                            {isConnected ? <FiCheckCircle size={24} /> : <FiXCircle size={24} />}
                        </div>
                        <div>
                            {isConnected ? (
                                <>
                                    <span>PayPal Account Connected</span>
                                    <p className="text-sm text-gray-600">You can now use PayPal for payment links.</p>
                                </>
                            ) : (
                                <span>PayPal Not Connected. Please contact the system owner.</span>
                            )}
                        </div>
                    </div>
                </section>

            )}


            {/* 4) Danger Zone: Deactivate */}
            <section>
                <h3 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h3>
                {renderDeactivateButton()}
            </section>

            {/* Password Update Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 relative">
                        <h3 className="text-xl font-bold mb-4">Update Password</h3>

                        {modalSuccess && (
                            <div className="mb-4 rounded-md bg-green-50 p-4">
                                <p className="text-green-600">{modalSuccess}</p>
                            </div>
                        )}
                        {modalError && (
                            <div className="mb-4 rounded-md bg-red-50 p-4">
                                <p className="text-red-600">{modalError}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="current_password"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="current_password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="new_password"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="new_password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="confirm_password"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirm_password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-end space-x-2">
                            <button
                                onClick={handleRequestTempPassword}
                                disabled={isUpdatingPassword}
                                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                            >
                                Request Temp Password
                            </button>
                            <button
                                onClick={handleUpdatePassword}
                                disabled={isUpdatingPassword}
                                className="bg-green-600 hover:bg-green-700 text-white 
                           px-4 py-2 rounded-md font-medium disabled:opacity-50 
                           flex items-center"
                            >
                                {isUpdatingPassword ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </button>
                            <button
                                onClick={closePasswordModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 
                           px-4 py-2 rounded-md font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PayPal Modal */}
            {isAddPayPalModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Connect PayPal Account</h3>

                        {/* Instructions Section */}
                        <details className="mb-4 bg-gray-100 p-4 rounded-lg">
                            <summary className="cursor-pointer font-medium text-indigo-600">
                                How to Get Your PayPal Client ID and Secret
                            </summary>
                            <ol className="mt-2 list-decimal list-inside text-sm text-gray-700">
                                <li>
                                    Go to the <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"><strong>PayPal Developer Dashboard</strong></a>.
                                </li>
                                <li>
                                    Log in with your PayPal account credentials. Ensure this is your <strong>business account</strong>.
                                </li>
                                <li>
                                    Navigate to the <strong>My Apps & Credentials</strong> section.
                                </li>
                                <li>
                                    Under the <strong>"Live"</strong> tab, click <strong>Create App</strong>.
                                </li>
                                <li>
                                    Enter a name for your app (e.g., <strong>"Ecommerce Integration"</strong>) and click <strong>Create App</strong>.
                                </li>
                                <li>
                                    After creating the app, you’ll see your <strong>Client ID</strong> and <strong>Secret</strong>. Copy both.
                                </li>
                                <li>
                                    Return here and paste the <strong>Client ID</strong> and <strong>Secret</strong> below.
                                </li>
                                <li>
                                    Make sure you're using the <strong>Live Credentials</strong>, not Sandbox ones.
                                </li>
                            </ol>
                        </details>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PayPal Client ID
                            </label>
                            <input
                                type="text"
                                value={paypalClientId}
                                onChange={(e) => setPaypalClientId(e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-indigo-300"
                                placeholder="Enter your PayPal Client ID"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PayPal Secret
                            </label>
                            <input
                                type="password"
                                value={paypalSecret}
                                onChange={(e) => setPaypalSecret(e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-indigo-300"
                                placeholder="Enter your PayPal Secret"
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setIsAddPayPalModalOpen(false)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePayPalCredentials}
                                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded ${isSaving ? "cursor-not-allowed opacity-70" : ""
                                    }`}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit PayPal Modal */}
            {isEditPayPalModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Edit PayPal Account</h3>
                        <h4 className="text-sm font-medium text-gray-600 mb-4"> This is encrypted credentials only. </h4>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PayPal Client ID
                            </label>
                            <div className="relative">
                                <input
                                    type={showPayPalClientId ? "text" : "password"}
                                    value={paypalClientId}
                                    onChange={(e) => setPaypalClientId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-indigo-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPayPalClientId((prev) => !prev)}
                                    className=" border-l-0 rounded-r px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPayPalClientId ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PayPal Secret
                            </label>
                            <div className="relative">
                                <input
                                    type={showPayPalSecret ? "text" : "password"}
                                    value={paypalSecret}
                                    onChange={(e) => setPaypalSecret(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-indigo-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPayPalSecret((prev) => !prev)}
                                    className="border-l-0 rounded-r px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPayPalSecret ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setIsEditPayPalModalOpen(false)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePayPalCredentials}
                                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded ${isSaving ? "cursor-not-allowed opacity-70" : ""}`}
                                disabled={isSaving}
                            >
                                {isSaving ? "Updating..." : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}




            {/* Deactivate Modal (System or Account) */}
            {isDeactivateModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">{getDeactivateTitle()}</h3>
                        <p className="mb-6 text-gray-700">{getDeactivateMessage()}</p>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={closeDeactivateModal}
                                className="bg-gray-300 hover:bg-gray-400 
                           text-gray-800 px-4 py-2 rounded-md font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeactivateConfirm}
                                className="bg-red-600 hover:bg-red-700 
                           text-white px-4 py-2 rounded-md font-medium"
                            >
                                {deactivateStep === 1 ? 'Yes, I understand' : 'Yes, deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
