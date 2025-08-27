import React from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../style/colours";

export type HobbyHistoryItem = {
  id: string | number;
  name: string;
  date: string;
  rating: number;
  notes?: string;
};

type HobbyHistorySectionProps = {
  data: HobbyHistoryItem[];
};

const HobbyHistorySection: React.FC<HobbyHistorySectionProps> = ({ data }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hobby History</Text>
      {data.length === 0 ? (
        <Text style={styles.emptyText}>No history yet</Text>
      ) : (
        data.map((hobby) => (
          <View key={hobby.id} style={styles.historyCard}>
            <Text style={styles.hobbyName}>{hobby.name}</Text>
            <Text>
              Date:{" "}
              {new Date(hobby.date).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text>
              Rating:{" "}
              {hobby.rating > 0
                ? "★".repeat(hobby.rating) + "☆".repeat(5 - hobby.rating)
                : "Not rated yet"}
            </Text>
            <Text>Notes: {hobby.notes || "No notes provided"}</Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: COLORS.text,
  },
  historyCard: {
    backgroundColor: COLORS.neutral,
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hobbyName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: COLORS.text,
  },
  emptyText: {
    fontStyle: "italic",
    color: COLORS.muted,
  },
});

export default HobbyHistorySection;
