import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/theme';
import type { ChatMessage } from '@/lib/types';
import { GrammarMarkdown } from './GrammarMarkdown';

interface CardChatProps {
  messages: ChatMessage[];
  streaming: boolean;
  onSend: (text: string) => void;
}

export function CardChat({ messages, streaming, onSend }: CardChatProps) {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setInputText('');
  }

  return (
    <View className="mt-4 gap-3">
      {/* Message history */}
      {messages.map((msg, i) => (
        <View key={i}>
          {msg.role === 'user' ? (
            <Text className="text-white text-sm">{msg.content}</Text>
          ) : (
            <View className="bg-slate-800 rounded-lg px-3 py-2">
              {msg.content ? (
                <GrammarMarkdown>{msg.content}</GrammarMarkdown>
              ) : (
                <ActivityIndicator size="small" color={Colors.border} />
              )}
            </View>
          )}
        </View>
      ))}

      {/* Input row */}
      <View className="flex-row items-center gap-2">
        <TextInput
          ref={inputRef}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm"
          placeholder="Ask about this card…"
          placeholderTextColor={Colors.border}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!streaming}
        />
        <TouchableOpacity
          className={`w-10 h-10 rounded-xl items-center justify-center ${
            !inputText.trim() || streaming ? 'bg-slate-700' : 'bg-indigo-600'
          }`}
          onPress={handleSend}
          disabled={!inputText.trim() || streaming}
          activeOpacity={0.7}
        >
          <Text className="text-white text-base font-semibold">→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
