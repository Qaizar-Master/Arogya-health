import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../vitals/vitals_screen.dart';

class LogVitalScreen extends ConsumerStatefulWidget {
  const LogVitalScreen({super.key});

  @override
  ConsumerState<LogVitalScreen> createState() => _LogVitalScreenState();
}

class _LogVitalScreenState extends ConsumerState<LogVitalScreen> {
  final _form = GlobalKey<FormState>();
  bool _loading = false;
  String? _error;

  final _bloodGlucose = TextEditingController();
  final _systolicBP = TextEditingController();
  final _diastolicBP = TextEditingController();
  final _heartRate = TextEditingController();
  final _spo2 = TextEditingController();
  final _weight = TextEditingController();
  final _temperature = TextEditingController();
  final _hba1c = TextEditingController();
  final _notes = TextEditingController();

  @override
  void dispose() {
    _bloodGlucose.dispose();
    _systolicBP.dispose();
    _diastolicBP.dispose();
    _heartRate.dispose();
    _spo2.dispose();
    _weight.dispose();
    _temperature.dispose();
    _hba1c.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    final body = <String, dynamic>{};
    if (_bloodGlucose.text.isNotEmpty) body['bloodGlucose'] = double.parse(_bloodGlucose.text);
    if (_systolicBP.text.isNotEmpty) body['systolicBP'] = int.parse(_systolicBP.text);
    if (_diastolicBP.text.isNotEmpty) body['diastolicBP'] = int.parse(_diastolicBP.text);
    if (_heartRate.text.isNotEmpty) body['heartRate'] = int.parse(_heartRate.text);
    if (_spo2.text.isNotEmpty) body['spo2'] = int.parse(_spo2.text);
    if (_weight.text.isNotEmpty) body['weight'] = double.parse(_weight.text);
    if (_temperature.text.isNotEmpty) body['temperature'] = double.parse(_temperature.text);
    if (_hba1c.text.isNotEmpty) body['hba1c'] = double.parse(_hba1c.text);
    if (_notes.text.isNotEmpty) body['notes'] = _notes.text.trim();

    if (body.isEmpty) {
      setState(() { _loading = false; _error = 'Enter at least one reading.'; });
      return;
    }

    try {
      await apiClient.post('/vitals', data: body);
      if (!mounted) return;
      ref.invalidate(vitalsProvider);
      context.go('/vitals');
    } catch (e) {
      setState(() => _error = 'Failed to save. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log Reading')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Section(title: 'Blood Sugar', children: [
                _NumField(controller: _bloodGlucose, label: 'Blood Glucose', unit: 'mg/dL', decimal: true),
                _NumField(controller: _hba1c, label: 'HbA1c', unit: '%', decimal: true),
              ]),
              _Section(title: 'Blood Pressure', children: [
                Row(children: [
                  Expanded(child: _NumField(controller: _systolicBP, label: 'Systolic', unit: 'mmHg')),
                  const SizedBox(width: 12),
                  Expanded(child: _NumField(controller: _diastolicBP, label: 'Diastolic', unit: 'mmHg')),
                ]),
              ]),
              _Section(title: 'Heart & Oxygen', children: [
                Row(children: [
                  Expanded(child: _NumField(controller: _heartRate, label: 'Heart Rate', unit: 'bpm')),
                  const SizedBox(width: 12),
                  Expanded(child: _NumField(controller: _spo2, label: 'SpO₂', unit: '%')),
                ]),
              ]),
              _Section(title: 'Body', children: [
                Row(children: [
                  Expanded(child: _NumField(controller: _weight, label: 'Weight', unit: 'kg', decimal: true)),
                  const SizedBox(width: 12),
                  Expanded(child: _NumField(controller: _temperature, label: 'Temp', unit: '°C', decimal: true)),
                ]),
              ]),
              _Section(title: 'Notes', children: [
                TextFormField(
                  controller: _notes,
                  decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
              ]),

              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),

              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(kBrandGreen),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Save Reading', style: TextStyle(fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey)),
          const SizedBox(height: 8),
          ...children,
          const SizedBox(height: 20),
        ],
      );
}

class _NumField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String unit;
  final bool decimal;

  const _NumField({
    required this.controller,
    required this.label,
    required this.unit,
    this.decimal = false,
  });

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        decoration: InputDecoration(
          labelText: label,
          suffixText: unit,
          border: const OutlineInputBorder(),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
        keyboardType: TextInputType.numberWithOptions(decimal: decimal),
        validator: (v) {
          if (v == null || v.isEmpty) return null;
          final n = num.tryParse(v);
          if (n == null) return 'Invalid';
          return null;
        },
      );
}
