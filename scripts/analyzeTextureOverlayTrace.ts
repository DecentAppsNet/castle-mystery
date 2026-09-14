/* This diagnostic script extracts reload-to-overlay-render timing and sampled overlay CPU costs from Chrome Performance traces.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_FUNCTION_NAME = '_applyStoneOverlayImageFilter';
const MAIN_DOCUMENT_URL = 'http://localhost:3000/';

type TraceEvent = {
  args?:{
    data?:{
      cpuProfile?:{
        nodes?:CpuProfileNode[],
        samples?:number[]
      },
      documentLoaderURL?:string,
      samples?:number[],
      timeDeltas?:number[]
    }
  },
  id?:string,
  name?:string,
  ph?:string,
  pid:number,
  tid:number,
  ts:number
};

type CpuProfileNode = {
  callFrame?:{
    functionName?:string,
    url?:string
  },
  id:number,
  parent?:number
};

type Trace = {
  traceEvents?:TraceEvent[]
};

type SampleMetrics = {
  firstTargetSampleTs:number,
  inclusiveUsecs:number,
  lastTargetSampleTs:number,
  selfUsecs:number,
  targetSampleCount:number
};

function _formatMsecs(usecs:number):string {
  return `${(usecs / 1000).toFixed(2)} ms`;
}

function _findNavigationStart(events:TraceEvent[]):number {
  const navigationEvents = events.filter(event =>
    event.name === 'navigationStart'
    && event.args?.data?.documentLoaderURL === MAIN_DOCUMENT_URL
  );
  if (navigationEvents.length !== 1) {
    throw new Error(`Expected one main-document navigationStart, found ${navigationEvents.length}.`);
  }
  return navigationEvents[0].ts;
}

function _nodeIncludesTarget(node:CpuProfileNode, nodesById:Map<number, CpuProfileNode>):boolean {
  let currentNode:CpuProfileNode|undefined = node;
  while (currentNode) {
    if (currentNode.callFrame?.functionName === TARGET_FUNCTION_NAME) return true;
    currentNode = currentNode.parent === undefined ? undefined : nodesById.get(currentNode.parent);
  }
  return false;
}

function _createEmptySampleMetrics():SampleMetrics {
  return {
    firstTargetSampleTs:Number.POSITIVE_INFINITY,
    inclusiveUsecs:0,
    lastTargetSampleTs:Number.NEGATIVE_INFINITY,
    selfUsecs:0,
    targetSampleCount:0
  };
}

function _aggregateTargetSamples(events:TraceEvent[], navigationStartTs:number):SampleMetrics {
  const nodesByProfile = new Map<string, Map<number, CpuProfileNode>>();
  const metrics = _createEmptySampleMetrics();

  for (const event of events) {
    if (event.name !== 'ProfileChunk') continue;
    const data = event.args?.data;
    const profile = data?.cpuProfile;
    const samples = data?.samples ?? profile?.samples;
    const timeDeltas = data?.timeDeltas;
    if (!samples || !timeDeltas || samples.length !== timeDeltas.length) continue;

    const profileKey = `${event.pid}|${event.tid}|${event.id ?? ''}`;
    let nodesById = nodesByProfile.get(profileKey);
    if (!nodesById) {
      nodesById = new Map<number, CpuProfileNode>();
      nodesByProfile.set(profileKey, nodesById);
    }
    profile?.nodes?.forEach(node => nodesById?.set(node.id, node));

    let sampleTs = event.ts - timeDeltas.slice(1).reduce((total, delta) => total + delta, 0);
    for (let sampleI = 0; sampleI < samples.length; ++sampleI) {
      if (sampleI > 0) sampleTs += timeDeltas[sampleI];
      if (sampleTs < navigationStartTs) continue;
      const node = nodesById.get(samples[sampleI]);
      if (!node || !_nodeIncludesTarget(node, nodesById)) continue;

      const delta = Math.max(0, timeDeltas[sampleI]);
      metrics.inclusiveUsecs += delta;
      if (node.callFrame?.functionName === TARGET_FUNCTION_NAME) metrics.selfUsecs += delta;
      metrics.targetSampleCount += 1;
      metrics.firstTargetSampleTs = Math.min(metrics.firstTargetSampleTs, sampleTs);
      metrics.lastTargetSampleTs = Math.max(metrics.lastTargetSampleTs, sampleTs);
    }
  }
  if (metrics.targetSampleCount === 0) throw new Error(`No ${TARGET_FUNCTION_NAME} samples found after navigation.`);
  return metrics;
}

function _findFirstPresentedFrameTs(events:TraceEvent[], afterTs:number):number {
  const drawFrame = events.find(event => event.name === 'DrawFrame' && event.ts >= afterTs);
  if (!drawFrame) throw new Error('No DrawFrame found after the final overlay sample.');
  return drawFrame.ts;
}

function _analyzeTrace(tracePath:string) {
  const resolvedPath = path.resolve(tracePath);
  const trace = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as Trace;
  const events = [...(trace.traceEvents ?? [])].sort((left, right) => left.ts - right.ts);
  const navigationStartTs = _findNavigationStart(events);
  const metrics = _aggregateTargetSamples(events, navigationStartTs);
  const firstPresentedFrameTs = _findFirstPresentedFrameTs(events, metrics.lastTargetSampleTs);

  return {
    tracePath:resolvedPath,
    navigationToPresentedFrameUsecs:firstPresentedFrameTs - navigationStartTs,
    ...metrics
  };
}

function _median(values:number[]):number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function main() {
  const tracePaths = process.argv.slice(2);
  if (tracePaths.length === 0) throw new Error('Provide at least one Chrome Performance trace path.');
  const results = tracePaths.map(_analyzeTrace);

  results.forEach((result, resultI) => {
    console.log(`Sample ${resultI + 1}: ${result.tracePath}`);
    console.log(`  reload to first DrawFrame after overlay work: ${_formatMsecs(result.navigationToPresentedFrameUsecs)}`);
    console.log(`  overlay sampled inclusive time: ${_formatMsecs(result.inclusiveUsecs)}`);
    console.log(`  overlay sampled self time: ${_formatMsecs(result.selfUsecs)}`);
    console.log(`  overlay samples: ${result.targetSampleCount}`);
  });

  console.log(`Median reload-to-render: ${_formatMsecs(_median(results.map(result => result.navigationToPresentedFrameUsecs)))}`);
  console.log('Invocation count and canvas dimensions are not encoded by sampled CPU profiles; inspect separately if required.');
}

main();
