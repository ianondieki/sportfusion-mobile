// Top-level safety net. A render error anywhere in the tree would otherwise
// white-screen the whole app with no way back; this catches it and shows a
// themed "try again" screen that resets the boundary so the user can recover
// without force-quitting.

import { Component, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { themes, DEFAULT_THEME, type Theme } from "../lib/themes";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep a breadcrumb in dev; a real app would forward this to Sentry etc.
    console.error("Uncaught UI error:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    // The theme provider may be the thing that crashed, so fall back to the
    // default palette rather than reading from context here.
    const t = themes[DEFAULT_THEME];
    const styles = makeStyles(t);

    return (
      <View style={styles.wrap}>
        <Text style={styles.bolt}>⚡</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          APEX hit an unexpected snag. Tap below to reload the screen — your
          settings are safe.
        </Text>
        {__DEV__ ? (
          <Text style={styles.detail} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        ) : null}
        <Pressable style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>TRY AGAIN</Text>
        </Pressable>
      </View>
    );
  }
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: t.color.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: t.space(8),
      gap: t.space(3),
    },
    bolt: { fontSize: 44 },
    title: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 26,
      letterSpacing: 0.5,
    },
    body: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    detail: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 12,
      textAlign: "center",
    },
    btn: {
      marginTop: t.space(2),
      backgroundColor: t.color.accent,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space(6),
      paddingVertical: t.space(3),
    },
    btnText: {
      color: t.color.onAccent,
      fontFamily: t.font.bodyMed,
      fontSize: 14,
      letterSpacing: 1.5,
    },
  });
