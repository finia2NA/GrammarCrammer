import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearBackendBaseUrl, getBackendBaseUrl, setAuthToken, setBackendBaseUrl } from '@/lib/storage';
import { register, login, setApiKey, validateApiKey, getMe, hydrateSettings, forgotPassword } from '@/lib/api';
import { formatHex } from 'culori';
import { useColors } from '@/constants/theme';
import { OnboardingBackground } from '@/components/OnboardingBackground';

// ─── Animated rainbow button ─────────────────────────────────────────────────

// Perceptually uniform rainbow via OKLCH (first === last for seamless tiling)
const RAINBOW_STEPS = 7;
const RAINBOW_CYCLE = Array.from({ length: RAINBOW_STEPS }, (_, i) =>
  formatHex({ mode: 'oklch', l: 0.7, c: 0.18, h: (i / (RAINBOW_STEPS - 1)) * 360 })!,
);
// Two full cycles back-to-back so we can translate by one cycle width seamlessly.
// slice(1) avoids doubling the boundary color where the two cycles meet.
const RAINBOW_TILED = [...RAINBOW_CYCLE, ...RAINBOW_CYCLE.slice(1)];

function RainbowButton({ onPress, label }: { onPress: () => void; label: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [btnWidth, setBtnWidth] = useState(0);
  const animStarted = useRef(false);

  useEffect(() => {
    if (!btnWidth || animStarted.current) return;
    animStarted.current = true;

    // The gradient strip is 4*btnWidth wide, containing two identical rainbow
    // cycles each spanning 2*btnWidth. Sweeping left by exactly 2*btnWidth
    // brings the second cycle into view — which is identical to the first —
    // so we can snap back to 0 and the transition is invisible.
    const sweep = btnWidth * 2;

    // Use a recursive approach instead of Animated.loop + 0-duration resets.
    // This avoids two problems:
    //  1. Animated.timing({duration:0}) in a sequence still schedules a frame,
    //     causing a visible flicker at the reset point.
    //  2. Animated.loop can apply its own easing curve on top of the inner one.
    // By using setValue(0) in the completion callback, the reset is synchronous
    // and happens between frames — no flicker, no extra easing.
    let fastCount = 0;

    function runSweep() {
      const duration = fastCount < 2 ? 1500 : 5000;
      fastCount++;

      Animated.timing(translateX, {
        toValue: -sweep,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return; // unmounted or interrupted
        translateX.setValue(0); // instant reset — no animation frame, no flicker
        runSweep();
      });
    }

    runSweep();
  }, [btnWidth, translateX]);

  return (
    <TouchableOpacity
      className="flex-1 rounded-xl overflow-hidden"
      onPress={onPress}
      activeOpacity={0.8}
      onLayout={e => setBtnWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ height: 50, justifyContent: 'center', alignItems: 'center' }}>
        {btnWidth > 0 && (
          <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: btnWidth * 4, transform: [{ translateX }] }}>
            <LinearGradient
              colors={[...RAINBOW_TILED]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15, zIndex: 1 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Card content ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const BACKEND_DEBUG_UI_ENABLED = Constants.expoConfig?.extra?.backendDebugUiEnabled !== false;

const WelcomeCard = memo(function WelcomeCard() {
  return (
    <>
      <Text className="text-4xl font-bold text-foreground mb-3">
        Welcome to{'\n'}GrammarCrammer
      </Text>
      <Text className="text-foreground-secondary text-base leading-7">
        GrammarCrammer is your AI-powered grammar study partner.
        Tell it what you want to practise, and it will generate
        a custom set of flashcards tailored to your topic — in any
        language you choose.
      </Text>
    </>
  );
});

const HowItWorksCard = memo(function HowItWorksCard() {
  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-5">
        How it works
      </Text>
      {[
        ['📝', 'Pick a topic', 'Type what you want to study, e.g. "Japanese conditionals" or "Spanish subjunctive".'],
        ['🤖', 'AI generates cards', 'Claude creates a grammar explanation and a set of flashcards just for that topic.'],
        ['✍️', 'Practise & get feedback', 'Translate each sentence. Claude grades your answer and explains any mistakes.'],
      ].map(([icon, title, desc]) => (
        <View key={title} className="flex-row mb-5">
          <Text className="text-2xl mr-3">{icon}</Text>
          <View className="flex-1">
            <Text className="text-foreground font-semibold text-base mb-1">{title}</Text>
            <Text className="text-foreground-secondary text-sm leading-5">{desc}</Text>
          </View>
        </View>
      ))}
    </>
  );
});

const AlphaWarningCard = memo(function AlphaWarningCard() {
  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-3">
        Alpha version
      </Text>
      <Text className="text-foreground-secondary text-base leading-7 mb-4">
        GrammarCrammer is in early development. Future updates may reset your data, including saved decks and collections.
      </Text>
      <Text className="text-foreground-secondary text-base leading-7">
        For now, use it to explore the concept and practise grammar freely — but don&apos;t invest time building elaborate collections just yet.
      </Text>
      <View className="mt-4 flex-row border-l-2 border-foreground-secondary pl-3 gap-2">
        <Text className="text-sm leading-6">💡</Text>
        <Text className="text-foreground-secondary text-sm leading-6 flex-1">
          You can also use the CSV export feature to save any work you would like to stick around!
        </Text>
      </View>
    </>
  );
});

interface AccountCardProps {
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  isLogin: boolean;
  onToggleMode: () => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  success: boolean;
}

function AccountCard({ email, onEmailChange, password, onPasswordChange, error, loading, isLogin, onToggleMode, onSubmit, onForgotPassword, success }: AccountCardProps) {
  const colors = useColors();
  const passwordRef = useRef<TextInput>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const formDim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (success) {
      Animated.parallel([
        Animated.timing(formDim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [success, formDim, successOpacity]);

  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">
        {success
          ? (isLogin ? 'Signed in!' : 'Account created!')
          : (isLogin ? 'Sign in' : 'Create account')}
      </Text>
      <Text className="text-foreground-secondary text-sm leading-6 mb-6">
        {success
          ? (isLogin
            ? 'Welcome back — your decks and settings are ready.'
            : 'Your account is set up and ready to go.')
          : (isLogin
            ? 'Welcome back! Sign in to access your decks and settings.'
            : 'Create an account to save your decks and study progress.')}
      </Text>

      {/* Email + Password fields */}
      <Animated.View style={{ opacity: success ? formDim : 1 }} className="mb-4">
        <Text className="text-foreground/80 text-sm font-medium mb-2">Email</Text>
        <View className="p-1 mb-3">
          <TextInput
            className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm"
            placeholder="you@example.com"
            placeholderTextColor={colors.foreground_muted}
            value={email}
            onChangeText={onEmailChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading && !success}
          />
        </View>
        <Text className="text-foreground/80 text-sm font-medium mb-2">Password</Text>
        <View className="p-1">
          <TextInput
            ref={passwordRef}
            className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm"
            placeholder="At least 8 characters"
            placeholderTextColor={colors.foreground_muted}
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            editable={!loading && !success}
          />
        </View>
      </Animated.View>

      {success && (
        <Animated.Text style={{ opacity: successOpacity, color: colors.foreground, fontSize: 24, fontWeight: '500', textAlign: 'center', marginTop: 20 }}>
          Success!
        </Animated.Text>
      )}

      {error && (
        <Text className="text-error text-xs mt-2">{error}</Text>
      )}
      {!success && (
        <>
          <TouchableOpacity onPress={onToggleMode} className="mt-4">
            <Text className="text-primary text-sm">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
          {isLogin && (
            <TouchableOpacity onPress={onForgotPassword} className="mt-2">
              <Text className="text-foreground-secondary text-sm">Forgot password?</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );
}

interface ApiKeyCardProps {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  canSkip?: boolean;
  onSkip?: () => void;
}

function ApiKeyCard({ apiKey, onApiKeyChange, error, loading, canSkip, onSkip }: ApiKeyCardProps) {
  const colors = useColors();
  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">
        Connect your Claude API key
      </Text>
      <Text className="text-foreground-secondary text-sm leading-6 mb-6">
        GrammarCrammer uses Claude to generate study content and grade your
        answers. Your key is stored securely on the server — it is only used to authenticate with Anthropic.
      </Text>
      <Text className="text-foreground/80 text-sm font-medium mb-2">
        Anthropic API Key
      </Text>
      <View className="p-1">
        <TextInput
          className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm font-mono"
          placeholder="sk-ant-..."
          placeholderTextColor={colors.foreground_muted}
          value={apiKey}
          onChangeText={onApiKeyChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>
      {error && (
        <Text className="text-error text-xs mt-2">{error}</Text>
      )}
      <Text className="text-foreground-secondary/70 text-xs mt-3 leading-5">
        Get a key at console.anthropic.com. Usage costs apply based on your
        Anthropic account.
      </Text>
      {canSkip && (
        <TouchableOpacity onPress={onSkip} className="mt-4">
          <Text className="text-primary text-sm">
            Skip — use the server&apos;s key instead
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ─── Hidden backend override ─────────────────────────────────────────────────

function normalizeBackendInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const hasScheme = /^https?:\/\//i.test(trimmed);
    const withScheme = hasScheme
      ? trimmed
      : /^[\d.]+(:\d+)?$/.test(trimmed) || trimmed.startsWith('localhost')
        ? `http://${trimmed}`
        : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!url.hostname) return null;
    if (!hasScheme && !url.port && url.protocol === 'http:') url.port = '3001';
    url.pathname = '/api';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function BackendHostModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [backendInput, setBackendInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    getBackendBaseUrl().then(url => {
      if (!mounted) return;
      setBackendInput(url?.replace(/^https?:\/\//, '').replace(/\/api$/, '') ?? '');
      setMessage(null);
    });
    return () => { mounted = false; };
  }, [visible]);

  async function handleSave() {
    const baseUrl = normalizeBackendInput(backendInput);
    if (!baseUrl) {
      setMessage('Enter a valid IP or URL.');
      return;
    }
    await setBackendBaseUrl(baseUrl);
    setMessage(`Saved ${baseUrl}`);
    onClose();
  }

  async function handleClear() {
    await clearBackendBaseUrl();
    setBackendInput('');
    setMessage('Cleared.');
  }

  async function handleTest() {
    const baseUrl = normalizeBackendInput(backendInput);
    if (!baseUrl) {
      setMessage('Enter a valid IP or URL.');
      return;
    }
    setMessage('Testing...');
    try {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(`HTTP ${res.status}`);
        return;
      }
      setMessage(body?.status === 'ok' ? `OK: ${baseUrl}` : 'Connected, but unexpected response.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Network request failed.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          className="bg-surface rounded-2xl p-5 border border-border"
          style={styles.backendModalCard}
          onPress={e => e.stopPropagation()}
        >
          <Text className="text-foreground text-lg font-bold mb-2">Backend IP</Text>
          <Text className="text-foreground-secondary text-sm leading-5 mb-4">
            Enter your Mac&apos;s Meshnet/LAN IP or a backend URL.
          </Text>
          <TextInput
            className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm font-mono"
            placeholder="100.86.5.173"
            placeholderTextColor={colors.foreground_muted}
            value={backendInput}
            onChangeText={setBackendInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {message && (
            <Text className="text-foreground-secondary text-xs mt-2">{message}</Text>
          )}
          <View className="flex-row gap-3 mt-5">
            <TouchableOpacity className="flex-1 py-3 rounded-xl border border-border items-center" onPress={handleClear}>
              <Text className="text-foreground/80 font-semibold">Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-3 rounded-xl border border-border items-center" onPress={handleTest}>
              <Text className="text-foreground/80 font-semibold">Test</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-3 rounded-xl bg-primary items-center" onPress={handleSave}>
              <Text className="text-primary-foreground font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Forgot password card (inline, replaces panel 4) ─────────────────────────

interface ForgotPasswordCardProps {
  email: string;
  onEmailChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  sent: boolean;
}

function ForgotPasswordCard({ email, onEmailChange, error, loading, sent }: ForgotPasswordCardProps) {
  const colors = useColors();

  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">Reset password</Text>
      {sent ? (
        <Text className="text-foreground-secondary text-sm leading-6">
          If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
        </Text>
      ) : (
        <>
          <Text className="text-foreground-secondary text-sm leading-6 mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>
          <Text className="text-foreground/80 text-sm font-medium mb-2">Email</Text>
          <View className="p-1">
            <TextInput
              className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm"
              placeholder="you@example.com"
              placeholderTextColor={colors.foreground_muted}
              value={email}
              onChangeText={onEmailChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>
          {error && <Text className="text-error text-xs mt-2">{error}</Text>}
        </>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [apiKey, setApiKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [backendModalVisible, setBackendModalVisible] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const stepRef = useRef(0);
  const cardRef = useRef<View>(null);
  const backgroundTapCount = useRef(0);
  const backgroundTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerWidthRef = useRef(0);
  const heights = useRef<number[]>(Array(TOTAL_STEPS).fill(0));
  const cardAnimX = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(200)).current;

  function onPanelLayout(index: number, h: number) {
    heights.current[index] = h;
    if (stepRef.current === index) heightAnim.setValue(h);
  }

  function goToStep(nextStep: number) {
    if (nextStep === stepRef.current || !containerWidthRef.current) return;
    Keyboard.dismiss();
    setError(null);
    if (showApiKeyForm) setShowApiKeyForm(false);
    if (showForgotPassword) { setShowForgotPassword(false); setForgotSent(false); }
    const pw = containerWidthRef.current;
    stepRef.current = nextStep;
    Animated.parallel([
      Animated.timing(cardAnimX, { toValue: -nextStep * pw, duration: 350, useNativeDriver: true }),
      Animated.timing(heightAnim, { toValue: heights.current[nextStep] || 200, duration: 350, useNativeDriver: false }),
    ]).start(() => setStep(nextStep));
  }

  // Step 3: account creation / login
  async function handleSubmitAccount() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (!isLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      if (password.trim().length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        setError('Password must contain at least one letter and one number.');
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const minWait = new Promise(r => setTimeout(r, 1200));
      const [result] = await Promise.all([
        isLogin
          ? login(email.trim(), password.trim())
          : register(email.trim(), password.trim()),
        minWait,
      ]);
      await setAuthToken(result.token);
      setLoading(false);
      setAccountSuccess(true);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'An error occurred.');
    }
  }

  async function handleForgotSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setForgotSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // API key submission (shown in-place on step 3 after account success)
  async function handleSubmitKey() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Please enter your API key.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await validateApiKey(trimmed);
      if (!result.valid) {
        setError(`Could not verify key: ${result.error ?? 'Unknown error'}`);
        return;
      }
      await setApiKey(trimmed);
      await hydrateSettings();
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // After account success, check if user already has an API key or central key
  // and either go home or show the API key form in-place.
  const [centralKeyAvailable, setCentralKeyAvailable] = useState(false);

  const handlePostAccountNext = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getMe();
      await hydrateSettings();
      setCentralKeyAvailable(me.centralKeyAvailable);
      if (me.hasApiKey || me.centralKeyAvailable) {
        router.replace('/home');
        return;
      }
    } catch {
      // If check fails, just show the API key form
    } finally {
      setLoading(false);
    }
    setError(null);
    setShowApiKeyForm(true);
  }, [router]);

  // Auto-redirect after login success: show rainbow for 1.5s then proceed
  useEffect(() => {
    if (accountSuccess && isLogin) {
      const timer = setTimeout(() => handlePostAccountNext(), 1500);
      return () => clearTimeout(timer);
    }
  }, [accountSuccess, isLogin, handlePostAccountNext]);

  const isForgotStep = step === 3 && showForgotPassword;
  const isAccountStep = step === 3 && !showApiKeyForm && !showForgotPassword;
  const isApiKeyStep = step === 3 && showApiKeyForm;

  const registerBackgroundTap = useCallback(() => {
    if (!BACKEND_DEBUG_UI_ENABLED) return;
    if (backgroundTapTimer.current) clearTimeout(backgroundTapTimer.current);
    backgroundTapCount.current += 1;
    if (backgroundTapCount.current >= 10) {
      backgroundTapCount.current = 0;
      setBackendModalVisible(true);
      return;
    }
    backgroundTapTimer.current = setTimeout(() => {
      backgroundTapCount.current = 0;
    }, 2500);
  }, []);

  const handleRootTouchEnd = useCallback((event: any) => {
    if (!BACKEND_DEBUG_UI_ENABLED) return;
    if (backendModalVisible) return;
    const { pageX, pageY } = event.nativeEvent;
    cardRef.current?.measureInWindow((x, y, width, height) => {
      const insideCard =
        pageX >= x &&
        pageX <= x + width &&
        pageY >= y &&
        pageY <= y + height;
      if (!insideCard) registerBackgroundTap();
    });
  }, [backendModalVisible, registerBackgroundTap]);

  // Note that this swipe is swipe -> move, not a true "drag". For now, this is fine imo, but could be better technically.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])   // activate only on clear horizontal movement
    .failOffsetY([-10, 10])     // yield to ScrollView if vertical scroll is intended
    .runOnJS(true)
    .onEnd(e => {
      if (e.translationX < -50 && stepRef.current < TOTAL_STEPS - 1) goToStep(stepRef.current + 1);
      else if (e.translationX > 50 && stepRef.current > 0) goToStep(stepRef.current - 1);
    });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      onTouchEndCapture={handleRootTouchEnd}
    >
      <OnboardingBackground />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card */}
        <View ref={cardRef} className="w-full max-w-md bg-surface rounded-3xl p-8 shadow-2xl">

          {/* Step dots */}
          <View className="flex-row mb-8 gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <TouchableOpacity key={i} className="flex-1 py-2" onPress={() => goToStep(i)} activeOpacity={0.7}>
                <View className={`h-1.5 rounded-full ${i === step ? 'bg-primary' : 'bg-background-muted'}`} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Card body — all panels rendered side-by-side for smooth height + slide */}
          <GestureDetector gesture={swipe}>
            <Animated.View
              style={{ height: heightAnim, overflow: 'hidden' }}
              onLayout={e => { containerWidthRef.current = e.nativeEvent.layout.width; }}
            >
              {/* Show the correct card based on the step using a map */}
              <Animated.View style={{ flexDirection: 'row', width: `${TOTAL_STEPS * 100}%`, transform: [{ translateX: cardAnimX }] }}>
                {([
                  <WelcomeCard key="welcome" />,
                  <HowItWorksCard key="how-it-works" />,
                  <AlphaWarningCard key="alpha-warning" />,
                  showForgotPassword
                    ? <ForgotPasswordCard key="forgot-card" email={email} onEmailChange={setEmail} error={step === 3 ? error : null} loading={loading} sent={forgotSent} />
                    : showApiKeyForm
                      ? <ApiKeyCard key="api-key-card" apiKey={apiKey} onApiKeyChange={setApiKeyInput} error={error} loading={loading} canSkip={centralKeyAvailable} onSkip={() => router.replace('/home')} />
                      : <AccountCard key="account-card" email={email} onEmailChange={setEmail} password={password} onPasswordChange={setPassword} error={step === 3 ? error : null} loading={loading} isLogin={isLogin} onToggleMode={() => setIsLogin(v => !v)} onSubmit={handleSubmitAccount} onForgotPassword={() => { setShowForgotPassword(true); setForgotSent(false); setError(null); }} success={accountSuccess} />,
                ] as const).map((panel, i) => (
                  <View key={i} style={{ width: `${100 / TOTAL_STEPS}%` }} onLayout={e => onPanelLayout(i, e.nativeEvent.layout.height)}>
                    {panel}
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {/* Navigation */}
          <View className="flex-row mt-8 gap-3">
            {(step > 0 || showApiKeyForm || showForgotPassword) && (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl border border-border items-center"
                onPress={() => {
                  if (showForgotPassword) {
                    setShowForgotPassword(false);
                    setForgotSent(false);
                    setError(null);
                  } else if (showApiKeyForm) {
                    setShowApiKeyForm(false);
                    setError(null);
                  } else {
                    goToStep(step - 1);
                  }
                }}
                disabled={loading}
              >
                <Text className="text-foreground/80 font-semibold">Back</Text>
              </TouchableOpacity>
            )}
            {isForgotStep ? (
              !forgotSent ? (
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${loading ? 'bg-primary/70' : 'bg-primary'}`}
                  onPress={handleForgotSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-primary-foreground font-semibold">Send Link</Text>
                  )}
                </TouchableOpacity>
              ) : null
            ) : isApiKeyStep ? (
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center ${loading ? 'bg-primary/70' : 'bg-primary'}`}
                onPress={handleSubmitKey}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold">Verify & Continue</Text>
                )}
              </TouchableOpacity>
            ) : isAccountStep ? (
              accountSuccess ? (
                <RainbowButton onPress={handlePostAccountNext} label={isLogin ? 'Redirecting…' : 'Next'} />
              ) : (
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${loading ? 'bg-primary/70' : 'bg-primary'}`}
                  onPress={handleSubmitAccount}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-primary-foreground font-semibold">{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  )}
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl bg-primary items-center"
                onPress={() => goToStep(step + 1)}
              >
                <Text className="text-primary-foreground font-semibold">Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      {BACKEND_DEBUG_UI_ENABLED && (
        <BackendHostModal visible={backendModalVisible} onClose={() => setBackendModalVisible(false)} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backendModalCard: {
    width: '100%',
    maxWidth: 420,
  },
});
