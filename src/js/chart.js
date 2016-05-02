import d3 from 'd3';
import config from './config';
import UI from './ui';
import { Sankey } from './sankey';
import _ from 'lodash';

// Basic chart constants
var margin = { top: config.chart.margin.top, right: config.chart.margin.right, bottom: config.chart.margin.bottom, left: config.chart.margin.left },
  width = config.chart.width - margin.left - margin.right,
  height = config.chart.height - margin.top - margin.bottom;

// Select and initialize the size of the chart
var svg = d3.select('#chart').append('svg')
  .attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
  })
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// create groups for links and nodes
var linksGroup = svg.append('g').attr('class', 'links');
var nodesGroup = svg.append('g').attr('class', 'nodes');

// Create a sanky diagram with these properties
var sankey = Sankey()
  .nodeWidth(config.chart.node.width)
  .nodePadding(config.chart.node.padding)
  .size([width, height])
  .levelTop(true) // levelTop and ordinalSort are largely mutually beneficial
  .sort(function ordinal(a, b) {
    return a.meta.source_rank - b.meta.source_rank;
  });

// Get path data generator
var path = sankey.link();

// draw chart
export function draw(graph, options, callback) {
  sankey
    .nodes(graph.nodes)
    .links(graph.links)
    .layout(config.chart.iterations);
  
  appendPercent(graph);

  // Draw the links
  var links = linksGroup.selectAll('.link').data(graph.links, function(d) { return d.meta.id; });
  // Enter
  links.enter()
    .append('path')
    .attr('class', 'link');
  // Enter + Update
  links.attr('d', path)
    .style('stroke-width', function(d) {
      return Math.max(1, d.dy);
    });
  links.append('title')
    .text(function(d) {
      return d.source.name + ' to ' + d.target.name + ' = ' + d.value;
    });

  links.on('mouseover', function(d) {
    d3.select(this).moveToFront();
    d3.select(this).classed('selected', true);
    d3.selectAll('.label-' + d.meta.id).classed('hidden', false);
  }).on('mouseout', function(d) {
    d3.select(this).classed('selected', false);
    d3.selectAll('.label-' + d.meta.id).classed('hidden', true)
  });
  // Exit
  links.exit().remove();
  
  var linkLabels = linksGroup.selectAll('.link-label')
    .data(_.concat(graph.links, graph.links), function(d, i) { 
      return i < graph.links.length ? 'source-' + d.meta.id : 'target-' + d.meta.id; 
    });
    
  // Enter
  var linkLabelEnterSelection = linkLabels.enter();
  
  linkLabelEnterSelection
    .append('g')
      .attr('class', function (d, i) {
        return i < graph.links.length ? 'link-label hidden label-' + d.meta.id + ' link-label-source-' + d.meta.source_rank + ' link-label-target-' + d.meta.target_id : 
          'link-label hidden label-' + d.meta.id + ' link-label-source-' + d.meta.source_rank + ' link-label-target-' + d.meta.target_id;
      })
      .append('text');
    
  // Enter + Update
  linkLabels
    .attr('transform', function(d, i) {
      let location = i < graph.links.length ? 0.05 : 0.95;
      let p = svg.append('path').attr('d', function(o){ return path(d); }).style('display', 'none').node();
      let length = p.getTotalLength();
      let point = p.getPointAtLength(location * length);
      p.remove();
      return 'translate(' + point.x + ',' + point.y + ')';
    })
    .select('text')
      .text(function(d, i) {
        return i < graph.links.length ? d.sourcePercent + '%' : d.targetPercent + '%';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', 6);

  // Exit
  linkLabels.exit().remove();
  
  // Draw the nodes
  var nodes = nodesGroup.selectAll('.node').data(graph.nodes, function(d) { 
    return d.meta.target_id + '.' + d.meta.source_rank + '.' + d.value; 
  });
  // Enter
  var nodesEnterSelection = nodes.enter()
    .append('g')
    .attr('class', function(d) {
      return 'node ' + d.type + ' ' + d.meta.party.toLowerCase();
    })
    .attr('id', function(d) { return 'node' + d.meta.id; })
  
  nodesEnterSelection.append('rect')
    .attr('width', sankey.nodeWidth())
    .append('title');
  
  nodesEnterSelection.append('text')
    .attr('x', function(d) {
      return _.isEqual(d.type, 'source') ? -config.chart.node.margin : (sankey.nodeWidth() + config.chart.node.margin);
    })
    .attr('dy', '.35em')
    .attr('text-anchor', function(d) {
      return _.isEqual(d.type, 'source') ? 'end' : 'start';
    })
    .attr('transform', null);
  
  nodesEnterSelection.on("contextmenu", function(d, i) {
    d3.event.preventDefault();
    callback(d3.select('.node.' + d.type + '#node' + d.meta.id), d.type, options);
  }).on("click", function(d, i) {
    d3.event.preventDefault();
    callback(d3.selectAll('.node.' + d.type + ':not(#node' + d.meta.id + ')'), d.type, options);
  });
  
  nodesEnterSelection.on('mouseover', function(d) {
    d3.selectAll('.link')
      .filter(function (o) {
        return (_.isEqual(d.type, 'source') && _.isEqual(o.meta.source_rank, d.meta.source_rank)) ||
          (_.isEqual(d.type, 'target') && _.isEqual(o.meta.target_id, d.meta.target_id));
      }).classed('selected', true);
    const labelsClass = d.type === 'source' ? '.link-label-source-' + d.meta.source_rank : 
      '.link-label-target-' + d.meta.target_id;
    d3.selectAll(labelsClass).classed('hidden', false);
  }).on('mouseout', function(d) {
    d3.selectAll('.selected').classed('selected', false);
    const labelsClass = d.type === 'source' ? '.link-label-source-' + d.meta.source_rank : 
      '.link-label-target-' + d.meta.target_id;
    d3.selectAll(labelsClass).classed('hidden', true);
  });
  
  // Enter + Update
  nodes
    .attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  
  nodes.select('rect')
    .attr('height', function(d) {
      return d.dy;
    })
  
  nodes.select('rect').select('title')
    .text(function(d) {
      return d.name;
    });
  
  nodes.select('text')
    .attr('y', function(d) {
      return d.dy / 2;
    })
    .text(function(d) {
      return d.name + ' (' + d.percent + '%)';
    });
  // Exit
  nodes.exit().remove();
  
  return shelf;
};

function appendPercent(graph) {
  _.forEach(graph.nodes, function(d) {
    let totalValue = 0;
    const peerNodes = _.filter(graph.nodes, function(o) {
      return _.isEqual(o.type, d.type);
    });
    _.forEach(peerNodes, function(d) {
      totalValue += d.value;
    })
    d.percent = Math.round(d.value / totalValue * 100);
  });
  
  _.forEach(graph.links, function(d) {
    d.sourcePercent = Math.round(d.value / d.source.value * 100);
    d.targetPercent = Math.round(d.value / d.target.value * 100);
  });
  
  console.log(graph);
}