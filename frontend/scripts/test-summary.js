// frontend/scripts/test-summary.js
import { readFileSync, writeFileSync } from 'fs';

try {
  const results = JSON.parse(readFileSync('./test-results.json', 'utf-8'));
  
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    skipped: results.numSkippedTests || 0,
    duration: results.testResults.reduce((sum, t) => sum + (t.duration || 0), 0),
    failedTests: [],
    errorSummary: [],
  };

  // Збираємо інформацію про провалені тести
  for (const testFile of results.testResults) {
    for (const test of testFile.assertionResults || []) {
      if (test.status === 'failed') {
        summary.failedTests.push({
          file: testFile.name.replace(process.cwd(), ''),
          suite: test.ancestorTitles.join(' > '),
          name: test.title,
          message: test.failureMessages[0] || 'No message',
        });
        
        // Короткий витяг помилки
        const msg = test.failureMessages[0] || '';
        const firstLine = msg.split('\n').find(l => l.trim() && !l.includes('at ')) || msg.split('\n')[0];
        summary.errorSummary.push(`❌ ${test.title}: ${firstLine.substring(0, 200)}`);
      }
    }
  }

  // Виводимо гарний звіт
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 ЗВІТ ПРО ТЕСТУВАННЯ GARDENOS');
  console.log('═'.repeat(70));
  console.log(`📅 Час: ${summary.timestamp}`);
  console.log(`⏱  Тривалість: ${(summary.duration / 1000).toFixed(2)}s`);
  console.log('─'.repeat(70));
  console.log(`✅ Пройдено: ${summary.passed}`);
  console.log(`❌ Провалено: ${summary.failed}`);
  console.log(`⏭  Пропущено: ${summary.skipped}`);
  console.log(`📊 Всього: ${summary.totalTests}`);
  console.log('─'.repeat(70));

  if (summary.failed > 0) {
    console.log('\n🔴 ПРОВАЛЕНІ ТЕСТИ:\n');
    summary.failedTests.forEach((t, i) => {
      console.log(`${i + 1}. ${t.suite} > ${t.name}`);
      console.log(`   📁 ${t.file}`);
      console.log(`   💥 ${t.message.split('\n')[0]}\n`);
    });
  } else {
    console.log('\n🎉 ВСІ ТЕСТИ ПРОЙДЕНО!');
  }

  console.log('═'.repeat(70));

  // Зберігаємо summary у файл для відправки
  writeFileSync('./test-summary.json', JSON.stringify(summary, null, 2));
  console.log('\n💾 Детальний звіт збережено в: test-summary.json');
  console.log('📤 Надішли мені вміст цього файлу для аналізу\n');

} catch (err) {
  console.error('Помилка генерації звіту:', err.message);
  process.exit(1);
}