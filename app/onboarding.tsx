import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { setApiKey } from '@/lib/storage';
import { validateApiKey } from '@/lib/claude';

// ─── Card content ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

function WelcomeCard() {
  return (
    <>
      <Text className="text-4xl font-bold text-white mb-3">
        Welcome to{'\n'}GrammarCrammer
      </Text>
      <Text className="text-slate-400 text-base leading-7">
        GrammarCrammer is your AI-powered grammar study partner.
        Tell it what you want to practise, and it will generate
        a custom set of flashcards tailored to your topic — in any
        language you choose.
      </Text>
    </>
  );
}

function HowItWorksCard() {
  return (
    <>
      <Text className="text-3xl font-bold text-white mb-5">
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
            <Text className="text-white font-semibold text-base mb-1">{title}</Text>
            <Text className="text-slate-400 text-sm leading-5">{desc}</Text>
          </View>
        </View>
      ))}
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
  return (
    <>
      <Text className="text-3xl font-bold text-white mb-2">
        Connect your Claude API key
      </Text>
      <Text className="text-slate-400 text-sm leading-6 mb-6">
        GrammarCrammer uses Claude to generate study content and grade your
        answers. Your key is stored locally on this device only — it never
        leaves your browser.
      </Text>
      <Text className="text-slate-300 text-sm font-medium mb-2">
        Anthropic API Key
      </Text>
      <TextInput
        className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-mono"
        placeholder="sk-ant-..."
        placeholderTextColor="#475569"
        value={apiKey}
        onChangeText={onApiKeyChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      {error && (
        <Text className="text-red-400 text-xs mt-2">{error}</Text>
      )}
      <Text className="text-slate-500 text-xs mt-3 leading-5">
        Get a key at console.anthropic.com. Usage costs apply based on your
        Anthropic account.
      </Text>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmitKey() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Please enter your API key.');
      return;
    }
    setError(null);
    setLoading(true);
    const err = await validateApiKey(trimmed);
    setLoading(false);
    if (err) {
      setError(`Could not verify key: ${err}`);
      return;
    }
    await setApiKey(trimmed);
    router.replace('/home');
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-1 items-center justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Card */}
        <View className="w-full max-w-md bg-slate-900 rounded-3xl p-8 shadow-2xl">

          {/* Step dots */}
          <View className="flex-row mb-8 gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full flex-1 ${
                  i === step ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </View>

          {/* Card body */}
          <View className="min-h-48">
            {step === 0 && <WelcomeCard />}
            {step === 1 && <HowItWorksCard />}
            {step === 2 && (
              <ApiKeyCard
                apiKey={apiKey}
                onApiKeyChange={setApiKeyInput}
                error={error}
                loading={loading}
              />
            )}
          </View>

          {/* Navigation */}
          <View className="flex-row mt-8 gap-3">
            {step > 0 && (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl border border-slate-600 items-center"
                onPress={goBack}
                disabled={loading}
              >
                <Text className="text-slate-300 font-semibold">Back</Text>
              </TouchableOpacity>
            )}
            {isLastStep ? (
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center ${
                  loading ? 'bg-indigo-800' : 'bg-indigo-600'
                }`}
                onPress={handleSubmitKey}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Verify & Continue</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl bg-indigo-600 items-center"
                onPress={goNext}
              >
                <Text className="text-white font-semibold">Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
