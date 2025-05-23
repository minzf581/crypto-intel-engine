const axios = require('axios');

// 测试价格服务的手动触发
async function testPriceSignal() {
  try {
    console.log('🔍 测试价格监控服务...');
    
    // 1. 检查服务健康状态
    const healthResponse = await axios.get('http://localhost:5001/health');
    console.log('✅ 服务健康状态:', healthResponse.data);
    
    // 2. 检查资产列表
    const assetsResponse = await axios.get('http://localhost:5001/api/assets');
    console.log('📊 可用资产数量:', assetsResponse.data.data.length);
    
    // 3. 检查当前信号数量
    const signalsResponse = await axios.get('http://localhost:5001/api/signals');
    console.log('🔔 当前信号数量:', signalsResponse.data.data.signals.length);
    
    // 4. 获取实时价格数据
    const priceResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
    console.log('💰 当前价格数据:');
    
    Object.entries(priceResponse.data).forEach(([coin, data]) => {
      const change = data.usd_24h_change;
      const changeStr = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
      console.log(`   ${coin.toUpperCase()}: $${data.usd.toLocaleString()} (${changeStr})`);
      
      if (Math.abs(change) >= 5) {
        console.log(`   🚨 ${coin.toUpperCase()} 价格变化 ≥5%，应该生成信号！`);
      }
    });
    
    // 5. 等待一段时间后再次检查信号
    console.log('\n⏳ 等待价格监控周期...');
    await new Promise(resolve => setTimeout(resolve, 65000)); // 等待超过1分钟
    
    const newSignalsResponse = await axios.get('http://localhost:5001/api/signals');
    const newSignalCount = newSignalsResponse.data.data.signals.length;
    
    console.log('🔔 检查后信号数量:', newSignalCount);
    
    if (newSignalCount > signalsResponse.data.data.signals.length) {
      console.log('✅ 检测到新信号！');
      const newSignals = newSignalsResponse.data.data.signals.slice(0, 3);
      newSignals.forEach(signal => {
        console.log(`   📈 ${signal.assetSymbol}: ${signal.description} (强度: ${signal.strength})`);
      });
    } else {
      console.log('ℹ️  暂无新信号生成（价格变化 < 5%）');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

console.log('🚀 启动价格信号测试...\n');
testPriceSignal(); 