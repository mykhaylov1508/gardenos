// frontend/scripts/e2e-summary.js
import { readFileSync, writeFileSync } from 'fs';

try {
  const results = JSON.parse(readFileSync('./e2e-results.json', 'utf-8'));
  
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: results.stats.expected,
    passed: results.stats.passed,
    failed: results.stats.failed,
    skipped: results.stats.skipped,
    duration: results.stats.duration,
    failedTests: [],
    pagesTested: new Set(),
  };

  // Збираємо інформацію
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      summary.pagesTested.add(spec.file.replace(/.*e2e\//, '').replace('.spec.ts', ''));
      
      for (const test of spec.tests || []) {
        if (test.results[0]?.status === 'failed') {
          summary.failedTests.push({
            file: spec.file,
            title: spec.title,
            error: test.results[0].error?.message?.split('\n')[0] || 'Unknown error',
          });
        }
      }
    }
  }

  // Виводимо звіт
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 E2E ЗВІТ ПРО ТЕСТУВАННЯ GARDENOS');
  console.log('═'.repeat(70));
  console.log(`📅 Час: ${summary.timestamp}`);
  console.log(`⏱  Тривалість: ${(summary.duration / 1000).toFixed(2)}s`);
  console.log('─'.repeat(70));
  console.log(`✅ Пройдено: ${summary.passed}`);
  console.log(`❌ Провалено: ${summary.failed}`);
  console.log(`⏭  Пропущено: ${summary.skipped}`);
  console.log(`📊 Всього: ${summary.totalTests}`);
  console.log(`📄 Сторінок протестовано: ${summary.pagesTested.size}`);
  console.log(`   ${Array.from(summary.pagesTested).join(', ')}`);
  console.log('─'.repeat(70));

  if (summary.failed > 0) {
    console.log('\n🔴 ПРОВАЛЕНІ ТЕСТИ:\n');
    summary.failedTests.forEach((t, i) => {
      console.log(`${i + 1}. ${t.title}`);
      console.log(`   📁 ${t.file}`);
      console.log(`   💥 ${t.error}\n`);
    });
  } else {
    console.log('\n🎉 ВСІ ТЕСТИ ПРОЙДЕНО!');
  }

  console.log('═'.repeat(70));

  writeFileSync('./e2e-summary.json', JSON.stringify(summary, null, 2));
  console.log('\n💾 Детальний звіт: e2e-summary.json');
  console.log('🌐 HTML звіт: e2e-report/index.html\n');

} catch (err) {
  console.error('Помилка:', err.message);
  process.exit(1);
}