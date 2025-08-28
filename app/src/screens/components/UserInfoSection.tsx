import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import COLORS from "../../style/colours";

interface UserInfoSectionProps {
  profile: {
    name: string;
    email: string;
    favouriteTags: string[];
    preferences: {
      wheelchairAccessible: boolean;
      ecoFriendly: boolean;
      trialAvailable: boolean;
    };
  };
  onSave: (updatedData: any) => void;
}

const possibleTags: string[] = [
  "Creative",
  "Active",
  "Relaxing",
  "Social",
  "Indoor",
  "Outdoor",
  "Educational",
  "Tech",
  "Nature",
  "Art",
  "Wellness",
];

const UserInfoSection: React.FC<UserInfoSectionProps> = ({
  profile,
  onSave,
}) => {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [favouriteTags, setFavouriteTags] = useState<string[]>(
    profile.favouriteTags
  );
  const [preferences, setPreferences] = useState(profile.preferences);

  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setFavouriteTags(profile.favouriteTags);
    setPreferences(profile.preferences);
  }, [profile]);

  const toggleTag = (tag: string) => {
    if (favouriteTags.includes(tag)) {
      setFavouriteTags(favouriteTags.filter((t) => t !== tag));
    } else {
      setFavouriteTags([...favouriteTags, tag]);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      email,
      favouriteTags,
      preferences,
    });
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>User Info</Text>

      <Text>Name:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text>Favorite Tags:</Text>
      <View style={styles.tagsContainer}>
        {possibleTags.map((tag) => {
          const isSelected = favouriteTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, isSelected && styles.tagSelected]}
              onPress={() => toggleTag(tag)}
            >
              <Text
                style={[styles.tagText, isSelected && styles.tagTextSelected]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Personalized Filters</Text>

      <View style={styles.preferenceRow}>
        <Text style={styles.label}>Wheelchair Accessible</Text>
        <Switch
          value={preferences.wheelchairAccessible}
          onValueChange={(val) =>
            setPreferences({ ...preferences, wheelchairAccessible: val })
          }
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={
            preferences.wheelchairAccessible ? COLORS.primary : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.preferenceRow}>
        <Text style={styles.label}>Eco-Friendly</Text>
        <Switch
          value={preferences.ecoFriendly}
          onValueChange={(val) =>
            setPreferences({ ...preferences, ecoFriendly: val })
          }
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={preferences.ecoFriendly ? COLORS.primary : "#f4f3f4"}
        />
      </View>

      <View style={styles.preferenceRow}>
        <Text style={styles.label}>Trial Available</Text>
        <Switch
          value={preferences.trialAvailable}
          onValueChange={(val) =>
            setPreferences({ ...preferences, trialAvailable: val })
          }
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={preferences.trialAvailable ? COLORS.primary : "#f4f3f4"}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    margin: 4,
  },
  tagSelected: {
    backgroundColor: COLORS.primary,
  },
  tagText: {
    color: COLORS.text,
  },
  tagTextSelected: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default UserInfoSection;
