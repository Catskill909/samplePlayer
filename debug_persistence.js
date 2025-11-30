const player = new SamplePlayer();
const testUrl = './audio/test.mp3';
const testData = { triggerPoints: [1, 2, 3, 4], currentPadIndex: 0 };
localStorage.setItem('triggerPoints_' + testUrl, JSON.stringify(testData));
console.log('Saved test data');
const loaded = localStorage.getItem('triggerPoints_' + testUrl);
console.log('Loaded:', loaded);
if (loaded === JSON.stringify(testData)) {
    console.log('Persistence check PASSED');
} else {
    console.log('Persistence check FAILED');
}
