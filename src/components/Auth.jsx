import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!email || !password) {
      setError("Email and password required.");
      setLoading(false);
      return;
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data?.user) onLogin(data.user);
      else setError("Check your email for confirmation.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else if (data?.user) onLogin(data.user);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 360, mx: "auto", mt: 8, p: 4, bgcolor: "#fff", borderRadius: 2, boxShadow: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        {mode === "signup" ? "Sign Up" : "Login"}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          required
        />
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
          {mode === "signup" ? "Sign Up" : "Login"}
        </Button>
      </form>
      <Button color="secondary" sx={{ mt: 2 }} onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
        {mode === "signup" ? "Already have an account? Login" : "Don't have an account? Sign Up"}
      </Button>
    </Box>
  );
}