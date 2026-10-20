import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Alert,
  ActivityIndicator, StyleSheet, SafeAreaView, Platform, StatusBar,
} from 'react-native';

// *** แก้ตรงนี้ ***
// Android emulator: http://10.0.2.2:3098/api | iOS sim / web: http://localhost:3098/api
// มือถือจริง: http://<IP เครื่องคอมในวง LAN>:3098/api
const API_BASE_URL = 'http://localhost:3098/api';

// Alert ที่ใช้ได้ทั้งมือถือและเว็บ
const notify = (title, msg) =>
  Platform.OS === 'web' ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);
const confirmDialog = (title, msg, onOk) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${msg}`)) onOk();
  } else {
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onOk },
    ]);
  }
};

export default function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const apiCall = async (endpoint, options = {}, tk = token) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(tk && { Authorization: `Bearer ${tk}` }),
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data;
  };

  const loadEmployees = async (tk = token) => {
    try {
      const data = await apiCall('/employees', {}, tk);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      notify('Error', e.message);
    }
  };

  // ---------- Login ----------
  const handleLogin = async () => {
    try {
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }, null);
      if (data.success) {
        setToken(data.token);
        await loadEmployees(data.token);
      }
    } catch (e) {
      notify('Login Failed', e.message);
    }
  };

  const handleLogout = () => {
    setToken(null); setEmployees([]); setClusters(null);
    setUsername(''); setPassword('');
  };

  // ---------- CRUD ----------
  const handleAdd = async () => {
    if (!name.trim() || !position.trim() || !salary.trim()) {
      return notify('Validation', 'Please fill in name, position and salary');
    }
    if (!Number.isFinite(Number(salary)) || Number(salary) < 0) {
      return notify('Validation', 'Salary must be a valid number');
    }
    try {
      await apiCall('/employees', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), position: position.trim(), salary: Number(salary) }),
      });
      setName(''); setPosition(''); setSalary('');
      await loadEmployees();
    } catch (e) {
      notify('Error', e.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await apiCall(`/employees/${id}/status`, { method: 'PUT' });
      await loadEmployees();
    } catch (e) {
      notify('Error', e.message);
    }
  };

  const handleDelete = (id) => {
    confirmDialog('Are you sure?', 'This employee will be removed.', async () => {
      try {
        await apiCall(`/employees/${id}`, { method: 'DELETE' });
        await loadEmployees();
      } catch (e) {
        notify('Error', e.message);
      }
    });
  };

  // ---------- Analytics ----------
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      const data = await apiCall('/employees/salary-clusters');
      setClusters(data.clusters || []);
    } catch (e) {
      notify('Error', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ---------- Login screen ----------
  if (!token) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <Text style={s.title}>HR Manager Login</Text>
        <TextInput style={s.input} placeholder="Username" autoCapitalize="none"
          value={username} onChangeText={setUsername} />
        <TextInput style={s.input} placeholder="Password" secureTextEntry
          value={password} onChangeText={setPassword} />
        <TouchableOpacity style={s.btn} onPress={handleLogin}>
          <Text style={s.btnText}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ---------- Dashboard ----------
  const header = (
    <View>
      <View style={s.row}>
        <Text style={s.title}>Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={s.link}>Logout</Text></TouchableOpacity>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Add Employee</Text>
        <TextInput style={s.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="Position" value={position} onChangeText={setPosition} />
        <TextInput style={s.input} placeholder="Salary" keyboardType="numeric"
          value={salary} onChangeText={setSalary} />
        <TouchableOpacity style={s.btn} onPress={handleAdd}>
          <Text style={s.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[s.btn, { backgroundColor: '#7c3aed' }]} onPress={handleAnalyze} disabled={analyzing}>
        <Text style={s.btnText}>Analyze Salary Structure</Text>
      </TouchableOpacity>
      {analyzing && <ActivityIndicator size="large" style={{ marginVertical: 12 }} />}
      {clusters && clusters.length === 0 && <Text style={s.muted}>No data to analyze</Text>}
      {clusters && clusters.map((c) => (
        <View key={c.group} style={[s.card, { borderLeftWidth: 5, borderLeftColor: '#7c3aed' }]}>
          <Text style={s.h2}>{c.group}</Text>
          <Text>Employees: {c.count}</Text>
          <Text>Average salary: {Number(c.centroid || 0).toLocaleString()} THB</Text>
        </View>
      ))}

      <Text style={[s.h2, { marginTop: 16 }]}>Employees ({employees.length})</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={employees}
        keyExtractor={(e) => String(e.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.muted}>No employees</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.h2}>{item.name}</Text>
            <Text>{item.position}</Text>
            <Text>Salary: {Number(item.salary).toLocaleString()}</Text>
            <Text style={{ color: item.status === 'Active' ? 'green' : 'orange', fontWeight: '600' }}>
              {item.status}
            </Text>
            <View style={s.row}>
              <TouchableOpacity style={[s.btnSm, { backgroundColor: '#2563eb' }]} onPress={() => handleToggle(item.id)}>
                <Text style={s.btnText}>Toggle Status</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSm, { backgroundColor: '#dc2626' }]} onPress={() => handleDelete(item.id)}>
                <Text style={s.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { justifyContent: 'center', padding: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  h2: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginVertical: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginVertical: 5 },
  btn: { backgroundColor: '#16a34a', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnSm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: '#2563eb', fontWeight: '600' },
  muted: { color: '#6b7280', textAlign: 'center', marginVertical: 8 },
});