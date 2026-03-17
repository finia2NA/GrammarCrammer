import { useState, useRef, useEffect, memo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setAuthToken } from '@/lib/storage';
import { register, login, setApiKey, validateApiKey, getApiKeyStatus } from '@/lib/api';
import { formatHex } from 'culori';
import { useColors } from '@/constants/theme';

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
  }, [btnWidth]);

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

const WelcomeCard = memo(function WelcomeCard() {
  return (
    <>
      <Text className="text-4xl font-bold text-foreground mb-3">
        Welcome to{'\n'}GrammarCrammer
      </Text>
      <Text className="text-muted-foreground text-base leading-7">
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
            <Text className="text-muted-foreground text-sm leading-5">{desc}</Text>
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
      <Text className="text-muted-foreground text-base leading-7 mb-4">
        GrammarCrammer is in early development. Future updates may reset your data, including saved decks and collections.
      </Text>
      <Text className="text-muted-foreground text-base leading-7">
        For now, use it to explore the concept and practise grammar freely — but don't invest time building elaborate collections just yet.
      </Text>
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
  success: boolean;
}

function AccountCard({ email, onEmailChange, password, onPasswordChange, error, loading, isLogin, onToggleMode, onSubmit, success }: AccountCardProps) {
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
  }, [success]);

  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">
        {success
          ? (isLogin ? 'Signed in!' : 'Account created!')
          : (isLogin ? 'Sign in' : 'Create account')}
      </Text>
      <Text className="text-muted-foreground text-sm leading-6 mb-6">
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
        <TextInput
          className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-3"
          placeholder="you@example.com"
          placeholderTextColor={colors.border}
          value={email}
          onChangeText={onEmailChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading && !success}
        />
        <Text className="text-foreground/80 text-sm font-medium mb-2">Password</Text>
        <TextInput
          ref={passwordRef}
          className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm"
          placeholder="At least 8 characters"
          placeholderTextColor={colors.border}
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          editable={!loading && !success}
        />
      </Animated.View>

      {success && (
        <Animated.Text style={{ opacity: successOpacity, color: colors.foreground, fontSize: 24, fontWeight: '500', textAlign: 'center', marginTop: 20 }}>
          Success!
        </Animated.Text>
      )}

      {error && (
        <Text className="text-destructive text-xs mt-2">{error}</Text>
      )}
      {!success && (
        <TouchableOpacity onPress={onToggleMode} className="mt-4">
          <Text className="text-primary text-sm">
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

interface ApiKeyCardProps {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  error: string | null;
  loading: boolean;
}

function ApiKeyCard({ apiKey, onApiKeyChange, error, loading }: ApiKeyCardProps) {
  const colors = useColors();
  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">
        Connect your Claude API key
      </Text>
      <Text className="text-muted-foreground text-sm leading-6 mb-6">
        GrammarCrammer uses Claude to generate study content and grade your
        answers. Your key is stored securely on the server — it is only used to authenticate with Anthropic.
      </Text>
      <Text className="text-foreground/80 text-sm font-medium mb-2">
        Anthropic API Key
      </Text>
      <TextInput
        className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm font-mono"
        placeholder="sk-ant-..."
        placeholderTextColor={colors.border}
        value={apiKey}
        onChangeText={onApiKeyChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      {error && (
        <Text className="text-destructive text-xs mt-2">{error}</Text>
      )}
      <Text className="text-muted-foreground/70 text-xs mt-3 leading-5">
        Get a key at console.anthropic.com. Usage costs apply based on your
        Anthropic account.
      </Text>
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

  const stepRef = useRef(0);
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
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // After account success, check if user already has an API key (login case)
  // and either go home or show the API key form in-place.
  async function handlePostAccountNext() {
    if (isLogin) {
      setLoading(true);
      try {
        const { hasKey } = await getApiKeyStatus();
        if (hasKey) {
          router.replace('/home');
          return;
        }
      } catch {
        // If check fails, just show the API key form
      } finally {
        setLoading(false);
      }
    }
    setError(null);
    setShowApiKeyForm(true);
  }

  // Auto-redirect after login success: show rainbow for 1.5s then proceed
  useEffect(() => {
    if (accountSuccess && isLogin) {
      const timer = setTimeout(() => handlePostAccountNext(), 1500);
      return () => clearTimeout(timer);
    }
  }, [accountSuccess, isLogin]);

  const isAccountStep = step === 3 && !showApiKeyForm;
  const isApiKeyStep = step === 3 && showApiKeyForm;

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
    >
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
        <View className="w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl">

          {/* Step dots */}
          <View className="flex-row mb-8 gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <TouchableOpacity key={i} className="flex-1 py-2" onPress={() => goToStep(i)} activeOpacity={0.7}>
                <View className={`h-1.5 rounded-full ${i === step ? 'bg-primary' : 'bg-muted'}`} />
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
                  <WelcomeCard />,
                  <HowItWorksCard />,
                  <AlphaWarningCard />,
                  showApiKeyForm
                    ? <ApiKeyCard apiKey={apiKey} onApiKeyChange={setApiKeyInput} error={error} loading={loading} />
                    : <AccountCard email={email} onEmailChange={setEmail} password={password} onPasswordChange={setPassword} error={step === 3 ? error : null} loading={loading} isLogin={isLogin} onToggleMode={() => setIsLogin(v => !v)} onSubmit={handleSubmitAccount} success={accountSuccess} />,
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
            {(step > 0 || showApiKeyForm) && (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl border border-border items-center"
                onPress={() => {
                  if (showApiKeyForm) {
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
            {isApiKeyStep ? (
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
    </KeyboardAvoidingView>
  );
}
