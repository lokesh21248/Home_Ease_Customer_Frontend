/**
 * Firebase Phone Authentication Service Interface
 * Ready for production Firebase config or dev simulation
 */

export interface PhoneAuthSession {
  verificationId: string;
  phone: string;
}

class FirebaseAuthService {
  private currentSession: PhoneAuthSession | null = null;

  async sendOtp(phoneNumber: string): Promise<PhoneAuthSession> {
    console.log('[FirebaseAuth] Sending OTP to:', phoneNumber);
    // In production, invoke native Firebase signInWithPhoneNumber / recaptchaVerifier
    const verificationId = 'firebase-vid-' + Math.floor(100000 + Math.random() * 900000);
    this.currentSession = { verificationId, phone: phoneNumber };
    return this.currentSession;
  }

  async verifyOtp(otp: string): Promise<{ success: boolean; uid: string; phone: string }> {
    console.log('[FirebaseAuth] Verifying OTP:', otp);
    // In production, invoke confirmationResult.confirm(otp)
    if (!this.currentSession) {
      throw new Error('No active verification session. Please request OTP again.');
    }
    if (otp.length !== 6) {
      throw new Error('Please enter a valid 6-digit OTP code.');
    }
    return {
      success: true,
      uid: 'fb-user-' + Math.random().toString(36).substring(7),
      phone: this.currentSession.phone,
    };
  }

  async signOut(): Promise<void> {
    console.log('[FirebaseAuth] Signed out from Firebase');
    this.currentSession = null;
  }
}

export const firebaseAuth = new FirebaseAuthService();
