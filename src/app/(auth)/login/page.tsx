'use client';

import { useState, useRef } from 'react';
import { authClient } from '@/lib/auth-client';
import { validatePassword } from '@/lib/auth/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

// 'otp' = sign-in code sent; 'verify' = account confirmation code sent
type SentMode = null | 'otp' | 'verify';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentMode, setSentMode] = useState<SentMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password tab state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- OTP handlers (unchanged) ---

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.endsWith('@ohsu.edu')) {
      setError('Please use your @ohsu.edu email address.');
      return;
    }

    setLoading(true);
    const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });

    setLoading(false);
    if (authError) {
      setError(authError.message || 'Failed to send code.');
    } else {
      setSentMode('otp');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (newOtp.every(d => d !== '')) {
        verifyOtp(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newOtp.every(d => d !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (token: string) => {
    setError(null);
    setVerifying(true);
    const { error: verifyError } = sentMode === 'verify'
      ? await authClient.emailOtp.verifyEmail({ email, otp: token })
      : await authClient.signIn.emailOtp({ email, otp: token });

    setVerifying(false);
    if (verifyError) {
      setError('Invalid or expired code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      window.location.href = '/dashboard';
    }
  };

  // --- Password handlers ---

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.endsWith('@ohsu.edu')) {
      setError('Please use your @ohsu.edu email address.');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      // Sign-up emails a confirmation code (sendVerificationOnSignUp)
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0],
      });

      setLoading(false);
      if (signUpError) {
        setError(signUpError.message || 'Failed to create account.');
      } else {
        setSentMode('verify');
      }
    } else {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError?.status === 403) {
        // Email not confirmed yet: send a confirmation code
        await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
        setLoading(false);
        setSentMode('verify');
        return;
      }

      setLoading(false);
      if (signInError) {
        setError('Invalid email or password.');
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  // --- Reset to initial state ---

  const resetForm = () => {
    setSentMode(null);
    setEmail('');
    setOtp(['', '', '', '', '', '']);
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Sim Lab Curriculum
          </CardTitle>
          <CardDescription>
            OHSU Orthopaedic Surgery Simulation &amp; Anatomy Lab
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentMode ? (
            /* Code entry screen (sign-in or account confirmation) */
            <div className="space-y-5 py-2">
              <div className="text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We sent a {sentMode === 'verify' ? 'confirmation' : 'sign-in'} code to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-13 text-center text-lg font-semibold border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    autoFocus={i === 0}
                    disabled={verifying}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {verifying && (
                <p className="text-sm text-center text-muted-foreground">Verifying...</p>
              )}

              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Use a different email
                </Button>
              </div>
            </div>
          ) : (
            /* Tabbed login form */
            <Tabs defaultValue="code" onValueChange={() => setError(null)}>
              <TabsList className="w-full">
                <TabsTrigger value="code">Email code</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>

              <TabsContent value="code">
                <form onSubmit={handleOtpSubmit} className="space-y-4 pt-4">
                  <Input
                    type="email"
                    placeholder="name@ohsu.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11"
                  />
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Sending code...' : 'Send sign-in code'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    We&apos;ll email a 6-digit code to your @ohsu.edu address.
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="password">
                <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
                  <Input
                    type="email"
                    placeholder="name@ohsu.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <>
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters.
                      </p>
                    </>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading
                      ? (isSignUp ? 'Creating account...' : 'Signing in...')
                      : (isSignUp ? 'Create account' : 'Sign in')
                    }
                  </Button>
                  <div className="text-xs text-center space-y-1">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                      className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {isSignUp ? 'Already have a password? Sign in' : 'New here? Create an account'}
                    </button>
                    {!isSignUp && (
                      <p className="text-muted-foreground">
                        Forgot your password? Sign in with an email code, then set a new one from the menu.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    An @ohsu.edu email is required.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
