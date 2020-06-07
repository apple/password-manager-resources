require 'json'
require 'set'

shared_websites = JSON.parse(File.read('quirks/websites-with-shared-credential-backends.json'))

shared_websites_sorted = shared_websites.sort_by(&:first)

File.open('quirks/websites-with-shared-credential-backends.json','w') do |f|
  f.write(JSON.pretty_generate(shared_websites_sorted, indent: '    '))
end
  
unless shared_websites == shared_websites_sorted
  STDERR.puts "The JSON in 'quirks/websites-with-shared-credential-backends.json' isn't sorted!"
  exit(1) 
end

seen_domains = Set.new
shared_websites.flatten.each do |domain|
  STDERR.puts "The domain '#{domain}' appears more than once!" if seen_domains.include?(domain)
  seen_domains << domain
end

exit(1) if seen_domains.count != shared_websites.flatten.count