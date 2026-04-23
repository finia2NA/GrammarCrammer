import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { TreeNode } from '@/lib/types';
import { AnimatedCollapsible } from '@/components/AnimatedCollapsible';
import { getCollapsedNodes, setCollapsedNodes } from '@/lib/storage';

interface DeckTreeProps {
  tree: TreeNode[];
  onStudy: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
}

export function DeckTree({ tree, onStudy, onEdit }: DeckTreeProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCollapsedNodes().then(ids => {
      setCollapsedIds(ids);
      setLoaded(true);
    });
  }, []);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setCollapsedNodes(next);
      return next;
    });
  }, []);

  if (tree.length === 0) {
    return (
      <View className="items-center py-16 px-8">
        <Text className="text-foreground-secondary text-base text-center leading-6">
          No decks yet.{'\n'}Use New Deck or + to create your first deck.
        </Text>
      </View>
    );
  }

  if (!loaded) return null;

  return (
    <View>
      {tree.map(node => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          collapsedIds={collapsedIds}
          onToggle={toggleCollapsed}
          onStudy={onStudy}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
}

// ─── Tree row ─────────────────────────────────────────────────────────────────

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onStudy: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
}

function TreeRow({ node, depth, collapsedIds, onToggle, onStudy, onEdit }: TreeRowProps) {
  const isCollection = node.deck === null;
  const expanded = !collapsedIds.has(node.id);

  return (
    <View>
      <View className="flex-row items-center" style={{ paddingLeft: depth * 20 }}>
        {/* Chevron / bullet */}
        {isCollection ? (
          <TouchableOpacity onPress={() => onToggle(node.id)} className="w-8 h-10 items-center justify-center">
            <Text className="text-foreground-secondary text-xs">{expanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-8 h-10 items-center justify-center">
            <Text className="text-foreground-secondary text-[8px]">●</Text>
          </View>
        )}

        {/* Name — tappable to study */}
        <TouchableOpacity
          className="flex-1 h-10 justify-center"
          onPress={() => onStudy(node)}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center gap-2">
            <Text
              className={`text-foreground text-base ${isCollection ? 'font-semibold' : ''}`}
              numberOfLines={1}
            >
              {node.name}
            </Text>
            {!isCollection && <StatusBadge status={node.deck!.explanationStatus} />}
          </View>
        </TouchableOpacity>

        {/* Edit button */}
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() => onEdit(node)}
          activeOpacity={0.6}
        >
          <Text className="text-foreground-secondary text-sm">✎</Text>
        </TouchableOpacity>
      </View>

      {/* Children */}
      {isCollection && (
        <AnimatedCollapsible expanded={expanded} keepMounted={false}>
          <View>
            {node.children.map(child => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                collapsedIds={collapsedIds}
                onToggle={onToggle}
                onStudy={onStudy}
                onEdit={onEdit}
              />
            ))}
          </View>
        </AnimatedCollapsible>
      )}
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return <Text className="text-success text-xs">✓</Text>;
    case 'generating':
      return <Text className="text-warning text-xs">⏳</Text>;
    case 'error':
      return <Text className="text-error text-xs">⚠</Text>;
    case 'pending':
      return <Text className="text-foreground-secondary text-xs">…</Text>;
    default:
      return null;
  }
}
